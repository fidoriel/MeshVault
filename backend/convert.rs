use std::path::PathBuf;

use opencascade::primitives::Shape;
use std::fs::OpenOptions;
use std::io::Cursor;
use stl_io::{AsciiStlReader, IndexedMesh, IndexedTriangle, Normal};
use threemf::{
    model::{Model, Triangle, Triangles, Vertex, Vertices},
    Mesh as ThreemfMesh,
};

use tracing::debug;

pub fn load_stl(stl_path: &PathBuf) -> anyhow::Result<IndexedMesh> {
    let mut file = OpenOptions::new().read(true).open(stl_path).unwrap();
    stl_io::read_stl(&mut file).map_err(|e| anyhow::anyhow!(e))
}

fn occt_shape_to_indexed_mesh(shape: &Shape) -> anyhow::Result<IndexedMesh> {
    let temp_stl_path = std::env::temp_dir().join(format!("tmp_{}.stl", uuid::Uuid::new_v4()));
    shape.write_stl(&temp_stl_path)?;

    let mut file = OpenOptions::new().read(true).open(&temp_stl_path).unwrap();
    let result = stl_io::read_stl(&mut file).map_err(|e| anyhow::anyhow!(e));

    std::fs::remove_file(&temp_stl_path)?;
    result
}

pub fn load_step(step_path: &PathBuf) -> anyhow::Result<IndexedMesh> {
    let shape = Shape::read_step(step_path)?;
    occt_shape_to_indexed_mesh(&shape)
}

pub fn load_iges(iges_path: &PathBuf) -> anyhow::Result<IndexedMesh> {
    let shape = Shape::read_iges(iges_path)?;
    occt_shape_to_indexed_mesh(&shape)
}

pub fn step_to_iges(step_path: &PathBuf) -> anyhow::Result<Vec<u8>> {
    let shape = Shape::read_step(step_path)?;
    let temp_path = std::env::temp_dir().join(format!("tmp_{}.iges", uuid::Uuid::new_v4()));
    shape.write_iges(&temp_path)?;

    let iges_data = std::fs::read(&temp_path)?;
    std::fs::remove_file(&temp_path)?;
    Ok(iges_data)
}

pub fn iges_to_step(iges_path: &PathBuf) -> anyhow::Result<Vec<u8>> {
    let shape = Shape::read_iges(iges_path)?;
    let temp_path = std::env::temp_dir().join(format!("tmp_{}.iges", uuid::Uuid::new_v4()));
    shape.write_step(&temp_path)?;

    let step_data = std::fs::read(&temp_path)?;
    std::fs::remove_file(&temp_path)?;
    Ok(step_data)
}

pub fn load_obj(path: &PathBuf) -> anyhow::Result<IndexedMesh> {
    let (models, _) = tobj::load_obj(
        path,
        &tobj::LoadOptions {
            triangulate: true,
            ignore_points: true,
            ignore_lines: true,
            ..Default::default()
        },
    )
    .expect("Failed to OBJ load file");
    let model = &models[0];

    // First, create a map of unique vertices to handle potential duplicates
    let mut unique_vertices = Vec::new();
    let mut vertex_map = std::collections::HashMap::new();

    // Process faces and collect unique vertices
    let mut faces = Vec::new();

    for chunk in model.mesh.indices.chunks(3) {
        let mut triangle_vertices = [0usize; 3];

        // Process each vertex in the triangle
        for (i, &idx) in chunk.iter().enumerate() {
            let vertex = &model.mesh.positions[(idx as usize * 3)..(idx as usize * 3 + 3)];
            let vertex_key = (
                (vertex[0] * 1000.0).round() as i32,
                (vertex[1] * 1000.0).round() as i32,
                (vertex[2] * 1000.0).round() as i32,
            );

            // Get or create index for this vertex
            let vertex_idx = match vertex_map.get(&vertex_key) {
                Some(&idx) => idx,
                None => {
                    let idx = unique_vertices.len();
                    unique_vertices.push(stl_io::Vector::new([vertex[0], vertex[1], vertex[2]]));
                    vertex_map.insert(vertex_key, idx);
                    idx
                }
            };

            triangle_vertices[i] = vertex_idx;
        }

        // Calculate face normal
        let v0 = unique_vertices[triangle_vertices[0]];
        let v1 = unique_vertices[triangle_vertices[1]];
        let v2 = unique_vertices[triangle_vertices[2]];

        // Calculate vectors for two edges of the triangle
        let edge1 = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]];
        let edge2 = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]];

        // Calculate normal using cross product
        let normal = [
            edge1[1] * edge2[2] - edge1[2] * edge2[1],
            edge1[2] * edge2[0] - edge1[0] * edge2[2],
            edge1[0] * edge2[1] - edge1[1] * edge2[0],
        ];

        // Normalize the normal vector
        let length = (normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2]).sqrt();

        let normalized_normal = if length > 0.0 {
            stl_io::Vector::new([normal[0] / length, normal[1] / length, normal[2] / length])
        } else {
            continue; // Skip degenerate triangles
        };

        // Only add non-degenerate triangles
        if triangle_vertices[0] != triangle_vertices[1]
            && triangle_vertices[1] != triangle_vertices[2]
            && triangle_vertices[2] != triangle_vertices[0]
        {
            faces.push(IndexedTriangle {
                normal: normalized_normal,
                vertices: triangle_vertices,
            });
        } else {
            debug!("Skipping degenerate triangle: {:?}", triangle_vertices);
        }
    }

    // Create the mesh with unique vertices
    let mesh = IndexedMesh {
        vertices: unique_vertices,
        faces,
    };

    // Validate the mesh
    mesh.validate()
        .map_err(|e| anyhow::anyhow!("Invalid mesh: {:?}", e))?;
    debug!(
        "Valid mesh with {} vertices and {} faces",
        mesh.vertices.len(),
        mesh.faces.len()
    );

    Ok(mesh)
}

pub fn stl_mesh_to_3mf_mesh(stl: &IndexedMesh) -> ThreemfMesh {
    let vertices = Vertices {
        vertex: stl
            .vertices
            .iter()
            .map(|v| Vertex {
                x: v[0].into(),
                y: v[1].into(),
                z: v[2].into(),
            })
            .collect(),
    };
    let triangles = Triangles {
        triangle: stl
            .faces
            .iter()
            .map(|f| Triangle {
                v1: f.vertices[0],
                v2: f.vertices[1],
                v3: f.vertices[2],
            })
            .collect(),
    };

    ThreemfMesh {
        vertices,
        triangles,
    }
}

pub fn convert_to_3mf(stl_path: &PathBuf) -> anyhow::Result<Vec<u8>> {
    let stl = load_stl(stl_path);

    save_as_threemf(&stl.unwrap())
}

pub fn save_as_threemf(stl: &IndexedMesh) -> anyhow::Result<Vec<u8>> {
    let threemf_mesh = stl_mesh_to_3mf_mesh(stl);
    let model = Model::from(threemf_mesh);

    let mut buffer = Vec::new();
    let mut cursor = Cursor::new(&mut buffer);

    threemf::write::write(&mut cursor, model).unwrap();
    Ok(buffer)
}

pub fn check_is_ascii(stl_path: &PathBuf) -> anyhow::Result<bool> {
    let mut file = OpenOptions::new().read(true).open(stl_path).unwrap();
    match AsciiStlReader::probe(&mut file) {
        Ok(()) => Ok(true),
        Err(_) => Ok(false),
    }
}

pub fn save_as_stl(stl: &IndexedMesh) -> anyhow::Result<Vec<u8>> {
    let mesh = stl
        .faces
        .iter()
        .map(|face| stl_io::Triangle {
            normal: Normal::new([1.0, 0.0, 0.0]),
            vertices: [
                stl.vertices[face.vertices[0]],
                stl.vertices[face.vertices[1]],
                stl.vertices[face.vertices[2]],
            ],
        })
        .collect::<Vec<_>>();

    let mut buffer = Vec::new();
    let mut cursor = Cursor::new(&mut buffer);
    stl_io::write_stl(&mut cursor, mesh.iter()).unwrap();
    Ok(buffer)
}

pub fn astl_convert_to_bstl(stl_path: &PathBuf) -> anyhow::Result<Vec<u8>> {
    if !check_is_ascii(stl_path).unwrap() {
        debug!("Nothing to do for stl");
    }

    let indexed_mesh = load_stl(stl_path);
    save_as_stl(&indexed_mesh.unwrap())
}

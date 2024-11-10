import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload } from "lucide-react";

interface DropzoneProps {
    onFilesDrop: (files: { cadFiles: File[]; threemfFiles: File[]; imgFiles: File[] }) => void;
    onError: (error: string) => void;
}

export function Dropzone({ onFilesDrop, onError }: DropzoneProps) {
    const meshFileFormats = [".obj", ".stl", ".3mf"];
    const cadFileFormats = [".step", ".stp", ".f3d", ".scad", ".igs", ".iges"];
    const imageFileFormats = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".webp"];

    const isValidFileType = (file: File) => {
        const ext = file.name.toLowerCase().substring(file.name.lastIndexOf("."));
        return meshFileFormats.includes(ext) || cadFileFormats.includes(ext) || imageFileFormats.includes(ext);
    };

    const onDrop = useCallback(
        (acceptedFiles: File[]) => {
            // Filter out any invalid file types
            const validFiles = acceptedFiles.filter((file) => isValidFileType(file));

            if (validFiles.length !== acceptedFiles.length) {
                onError("Some files were skipped due to unsupported file types");
            }

            // Process valid files
            const newCadFiles: File[] = [];
            const newthreemfFiles: File[] = [];
            const newImgFiles: File[] = [];

            validFiles.forEach((file) => {
                const ext = file.name.toLowerCase().substring(file.name.lastIndexOf("."));

                if (meshFileFormats.includes(ext)) {
                    newthreemfFiles.push(file);
                } else if (cadFileFormats.includes(ext)) {
                    newCadFiles.push(file);
                } else if (imageFileFormats.includes(ext)) {
                    newImgFiles.push(file);
                }
            });

            onFilesDrop({
                cadFiles: newCadFiles,
                threemfFiles: newthreemfFiles,
                imgFiles: newImgFiles,
            });
        },
        [onError, onFilesDrop],
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        multiple: true,
        maxSize: 1024 * 1024 * 1024, // 1GB
    });

    return (
        <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
        ${isDragActive ? "border-primary bg-primary/5" : "border-border"}`}
        >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <div className="space-y-2">
                <p className="text-sm font-medium">
                    {isDragActive ? "Drop the files here" : "Drag and drop your files here"}
                </p>
                <p className="text-xs text-muted-foreground">Mesh files: {meshFileFormats.join(", ")}</p>
                <p className="text-xs text-muted-foreground">CAD files: {cadFileFormats.join(", ")}</p>
                <p className="text-xs text-muted-foreground">Image files: {imageFileFormats.join(", ")}</p>
            </div>
        </div>
    );
}

export default Dropzone;

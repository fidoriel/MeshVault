import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BACKEND_BASE_URL } from "./lib/api";
import { useToast } from "./hooks/use-toast";
import { UploadResponse } from "./bindings";
import { useNavigate } from "react-router-dom";

interface ModelPackV0_1 {
    version: string;
    title: string;
    author: string;
    origin: string;
    license: string;
}

function UploadEditModel() {
    const [modelData, setModelData] = useState<ModelPackV0_1>({
        version: "0.1",
        title: "",
        author: "",
        origin: "",
        license: "",
    });
    const [description, setDescription] = useState("");
    const [cadFiles, setCadFiles] = useState<File[]>([]);
    const [threedFiles, setThreedFiles] = useState<File[]>([]);
    const [imgFiles, setImgFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState("");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const { toast } = useToast();

    const meshFileFormats = [".obj", ".stl", ".3mf"];
    const cadFileFormats = [".step", ".stp", ".f3d", ".scad", ".igs", ".iges"];
    const imageFileFormats = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".webp"];

    const navigate = useNavigate();

    const isValidFileType = (file: File) => {
        const ext = file.name.toLowerCase().substring(file.name.lastIndexOf("."));
        return meshFileFormats.includes(ext) || cadFileFormats.includes(ext) || imageFileFormats.includes(ext);
    };

    const onDrop = useCallback((acceptedFiles: File[]) => {
        setError("");

        // Filter out any invalid file types
        const validFiles = acceptedFiles.filter((file) => isValidFileType(file));

        if (validFiles.length !== acceptedFiles.length) {
            setError("Some files were skipped due to unsupported file types");
        }

        // Process valid files
        const newCadFiles: File[] = [];
        const newThreedFiles: File[] = [];
        const newImgFiles: File[] = [];

        validFiles.forEach((file) => {
            const ext = file.name.toLowerCase().substring(file.name.lastIndexOf("."));

            if (meshFileFormats.includes(ext)) {
                newThreedFiles.push(file);
            } else if (cadFileFormats.includes(ext)) {
                newCadFiles.push(file);
            } else if (imageFileFormats.includes(ext)) {
                newImgFiles.push(file);
            }
        });

        // Update state with new files while preserving existing ones
        setCadFiles((prev) => [...prev, ...newCadFiles]);
        setThreedFiles((prev) => [...prev, ...newThreedFiles]);
        setImgFiles((prev) => [...prev, ...newImgFiles]);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        multiple: true,
        maxSize: 1024 * 1024 * 1024, // 1GB
    });

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsUploading(true);
        setError("");
        setErrorMessage(null);

        if (!modelData.title) {
            setError("Model name is required");
            setIsUploading(false);
            return;
        }

        if (threedFiles.length === 0 && cadFiles.length === 0) {
            setError("At least one 3D or CAD file is required");
            setIsUploading(false);
            return;
        }

        try {
            const formData = new FormData();

            const metadataBlob = new Blob([JSON.stringify(modelData)], {
                type: "application/json",
            });
            formData.append("modelpack.json", metadataBlob, "modelpack.json");

            const descriptionBlob = new Blob([description], {
                type: "text/markdown",
            });
            formData.append("README.md", descriptionBlob, "README.md");

            threedFiles.forEach((file) => {
                formData.append(`mesh_files`, file);
            });

            cadFiles.forEach((file) => {
                formData.append(`cad_files`, file);
            });

            imgFiles.forEach((file) => {
                formData.append(`image_files`, file);
            });

            const response = await fetch(`${BACKEND_BASE_URL}/api/upload`, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || "Upload failed");
            }

            const result: UploadResponse = await response.json();

            toast({
                title: "Upload Successful",
                description: result.message,
            });

            // Reset form after successful upload
            setModelData({
                version: "0.1",
                title: "",
                author: "",
                origin: "",
                license: "",
            });
            setDescription("");
            setCadFiles([]);
            setThreedFiles([]);
            setImgFiles([]);

            navigate(`/model/${result.slug}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Upload failed");
            setErrorMessage(err instanceof Error ? err.message : "Upload failed");
        } finally {
            setIsUploading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setModelData((prev) => ({
            ...prev,
            [id === "modelName" ? "title" : id]: value,
        }));
    };

    const removeFile = (fileType: "cad" | "threed" | "img", index: number) => {
        switch (fileType) {
            case "cad":
                setCadFiles((prev) => prev.filter((_, i) => i !== index));
                break;
            case "threed":
                setThreedFiles((prev) => prev.filter((_, i) => i !== index));
                break;
            case "img":
                setImgFiles((prev) => prev.filter((_, i) => i !== index));
                break;
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="max-w-screen-2xl mx-auto p-3">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-3xl font-bold">Upload new Model</h1>
                </div>

                {errorMessage && (
                    <Alert variant="destructive" className="mb-6">
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{errorMessage}</AlertDescription>
                    </Alert>
                )}

                <Card className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="modelName">Model Name</Label>
                            <Input
                                id="modelName"
                                value={modelData.title}
                                onChange={handleInputChange}
                                placeholder="Enter model name"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="author">Author Name</Label>
                            <Input
                                id="author"
                                value={modelData.author}
                                onChange={handleInputChange}
                                placeholder="Enter author name"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="origin">Origin</Label>
                            <Input
                                id="origin"
                                value={modelData.origin}
                                onChange={handleInputChange}
                                placeholder="Enter Origin URL"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="license">License</Label>
                            <Input
                                id="license"
                                list="license-suggestions"
                                value={modelData.license}
                                onChange={handleInputChange}
                                placeholder="Enter License Information"
                            />
                            <datalist id="license-suggestions">
                                <option value="MIT">MIT License</option>
                                <option value="GPLv3">GNU General Public License v3.0</option>
                                <option value="Apache">Apache License 2.0</option>
                                <option value="BSD">BSD 3-Clause License</option>
                                <option value="CC0">Creative Commons Zero v1.0 Universal</option>
                                <option value="CC BY">Creative Commons Attribution 4.0</option>
                                <option value="CC BY-SA">Creative Commons Attribution-ShareAlike 4.0</option>
                                <option value="CC BY-ND">Creative Commons Attribution-NoDerivs 4.0</option>
                                <option value="CC BY-NC">Creative Commons Attribution-NonCommercial 4.0</option>
                                <option value="CC BY-NC-SA">
                                    Creative Commons Attribution-NonCommercial-ShareAlike 4.0
                                </option>
                                <option value="CC BY-NC-ND">
                                    Creative Commons Attribution-NonCommercial-NoDerivs 4.0
                                </option>
                                <option value="Proprietary">Proprietary No Redistribution</option>
                            </datalist>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Enter model description (optional)"
                                rows={4}
                            />
                        </div>

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
                                <p className="text-xs text-muted-foreground">
                                    Mesh files: {meshFileFormats.join(", ")}
                                </p>
                                <p className="text-xs text-muted-foreground">CAD files: {cadFileFormats.join(", ")}</p>
                                <p className="text-xs text-muted-foreground">
                                    Image files: {imageFileFormats.join(", ")}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {[
                                { title: "3D Files", files: threedFiles, type: "threed" as const },
                                { title: "CAD Files", files: cadFiles, type: "cad" as const },
                                { title: "Image Files", files: imgFiles, type: "img" as const },
                            ].map(({ title, files, type }) => (
                                <div key={title} className="border rounded-lg p-4">
                                    <h3 className="font-medium mb-2">{title}</h3>
                                    <ul className="space-y-2">
                                        {files.map((file, index) => (
                                            <li
                                                key={`${file.name}-${index}`}
                                                className="flex items-center justify-between"
                                            >
                                                <span className="text-sm">{file.name}</span>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeFile(type, index)}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>

                        {error && (
                            <Alert variant="destructive">
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={isUploading || !modelData.title || (!threedFiles.length && !cadFiles.length)}
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Uploading...
                                </>
                            ) : (
                                "Upload Model"
                            )}
                        </Button>
                    </form>
                </Card>
            </div>
        </div>
    );
}

export default UploadEditModel;

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BACKEND_BASE_URL } from "./lib/api";
import { useToast } from "./hooks/use-toast";
import { ModelPackV0_1, UploadResponse } from "./bindings";
import { useNavigate } from "react-router-dom";
import Dropzone from "./Dropzone";

function UploadModel() {
    const [modelData, setModelData] = useState<ModelPackV0_1>({
        version: "0.1",
        title: "",
        author: "",
        origin: "",
        license: "",
    });
    const [description, setDescription] = useState("");
    const [cadFiles, setCadFiles] = useState<File[]>([]);
    const [threemfFiles, setthreemfFiles] = useState<File[]>([]);
    const [imgFiles, setImgFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState("");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const { toast } = useToast();
    const navigate = useNavigate();

    const handleFilesDrop = ({
        cadFiles: newCadFiles,
        threemfFiles: newthreemfFiles,
        imgFiles: newImgFiles,
    }: {
        cadFiles: File[];
        threemfFiles: File[];
        imgFiles: File[];
    }) => {
        setCadFiles((prev) => [...prev, ...newCadFiles]);
        setthreemfFiles((prev) => [...prev, ...newthreemfFiles]);
        setImgFiles((prev) => [...prev, ...newImgFiles]);
    };

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

        if (threemfFiles.length === 0 && cadFiles.length === 0) {
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

            threemfFiles.forEach((file) => {
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

    const removeFile = (fileType: "cad" | "threemf" | "img", index: number) => {
        switch (fileType) {
            case "cad":
                setCadFiles((prev) => prev.filter((_, i) => i !== index));
                break;
            case "threemf":
                setthreemfFiles((prev) => prev.filter((_, i) => i !== index));
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

                        <Dropzone onFilesDrop={handleFilesDrop} onError={setError} />

                        <div className="space-y-4">
                            {[
                                { title: "3D Files", files: threemfFiles, type: "threemf" as const },
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
                            disabled={isUploading || !modelData.title || (!threemfFiles.length && !cadFiles.length)}
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

export default UploadModel;

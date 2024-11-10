import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Heart, MoreVertical, RefreshCcw, Bookmark } from "lucide-react";

import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DetailedFileResponse, DetailedModelResponse } from "./bindings";
import { BACKEND_BASE_URL } from "./lib/api";
import { saveAs } from "file-saver";
import { ChevronLeft, ChevronRight } from "lucide-react";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AspectRatio } from "./components/ui/aspect-ratio";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "./components/ui/dialog";
import { DialogHeader } from "./components/ui/dialog";
import ModelViewer from "./ModelViewer";
import { useToast } from "./hooks/use-toast";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function OptionsDropdownMenu({ model }: { model: DetailedModelResponse }) {
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const { toast } = useToast();
    const navigate = useNavigate();

    async function deleteModel() {
        fetch(BACKEND_BASE_URL + `/api/model/${model.name}/delete`, {
            method: "POST",
        })
            .then((response) => {
                if (!response.ok) {
                    toast({
                        title: `Deleting model "${model.title}" failed`,
                        description: `An unknown server error occurred`,
                    });
                }
                toast({
                    title: `Deleting model "${model.title}" successful`,
                    description: `It is now permanently removed`,
                });
                navigate("/");
            })
            .catch((error) => {
                console.error("Fetch error:", error);
            });
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger>
                    <MoreVertical className="h-5 w-5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuLabel>Model Options</DropdownMenuLabel>
                    <DropdownMenuSeparator></DropdownMenuSeparator>
                    <DropdownMenuItem onClick={() => navigate(`/model/${model.name}/edit`)}>Edit</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)}>Delete</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={isDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure to delete "{model.title}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete "{model.title}" from database and
                            filesystem.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={deleteModel}
                            className="bg-destructive hover:bg-destructive/80 text-destructive-foreground"
                        >
                            Delete
                        </AlertDialogAction>{" "}
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

function ImageGallery({ model }: { model: DetailedModelResponse }) {
    const [selectedImage, setSelectedImage] = useState<number>(0);
    const thumbnailsRef = useRef<HTMLDivElement>(null);

    const nextImage = () => {
        setSelectedImage((prev) => (prev + 1) % model.images.length);
    };

    const previousImage = () => {
        setSelectedImage((prev) => (prev - 1 + model.images.length) % model.images.length);
    };

    // Scroll selected thumbnail into view
    useEffect(() => {
        const thumbnailsContainer = thumbnailsRef.current;
        if (!thumbnailsContainer) return;

        const selectedThumbnail = thumbnailsContainer.children[selectedImage] as HTMLElement;
        if (!selectedThumbnail) return;

        const scrollLeft =
            selectedThumbnail.offsetLeft - thumbnailsContainer.offsetWidth / 2 + selectedThumbnail.offsetWidth / 2;
        thumbnailsContainer.scrollTo({
            left: scrollLeft,
            behavior: "smooth",
        });
    }, [selectedImage]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowLeft") {
                previousImage();
            } else if (e.key === "ArrowRight") {
                nextImage();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    return (
        <div className="w-full max-w-4xl">
            <Card className="mb-4 relative group">
                <CardContent className="p-0">
                    <AspectRatio ratio={4 / 3}>
                        <img
                            src={`${BACKEND_BASE_URL}${model.images[selectedImage]}`}
                            alt="Model Preview"
                            className="w-full h-full object-cover rounded-lg"
                        />
                    </AspectRatio>
                    <button
                        onClick={previousImage}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Previous image"
                    >
                        <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                        onClick={nextImage}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Next image"
                    >
                        <ChevronRight className="h-6 w-6" />
                    </button>
                </CardContent>
            </Card>

            <div className="relative">
                <div ref={thumbnailsRef} className="flex gap-2 overflow-x-auto pb-2 px-8 scroll-smooth scrollbar-hide">
                    {model.images.map((img, index) => (
                        <div key={index} className="w-20 h-20 flex-shrink-0 p-1 pb-2">
                            <button
                                onClick={() => setSelectedImage(index)}
                                className={`w-full h-full relative rounded-lg overflow-hidden ${
                                    index === selectedImage ? "ring-2 ring-offset-2" : "hover:opacity-80"
                                }`}
                            >
                                <img
                                    src={`${BACKEND_BASE_URL}${img}`}
                                    alt={`Preview ${index + 1}`}
                                    className="w-full h-full object-cover"
                                />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function InfoCard({ model, refresh }: { model: DetailedModelResponse; refresh: () => void }) {
    return (
        <div className="w-full max-w-lg px-1">
            <div className="flex justify-between items-start mb-6">
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold">{model.title}</h1>
                </div>
                <OptionsDropdownMenu model={model} />
            </div>

            <div className="mb-6">
                <div className="space-y-4">
                    <div className="font-medium text-gray-400">{model.author}</div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="h-8">
                            Printables
                        </Button>
                        <Button variant="outline" size="sm" className="h-8">
                            Thingiverse
                        </Button>
                        <Button variant="outline" size="sm" className="h-8">
                            Thangs
                        </Button>
                    </div>
                </div>
            </div>

            <div className="space-y-3 mb-6">
                <Button
                    size="lg"
                    className="w-full"
                    onClick={() => (window.location.href = BACKEND_BASE_URL + "/api/download/" + model.package_name)}
                >
                    <Download className="mr-2 h-5 w-5" />
                    Download
                </Button>
                <div className="grid grid-cols-3 gap-2">
                    <Button variant="outline" className="w-full">
                        <Heart className="h-5 w-5" />
                    </Button>
                    <Button
                        variant="outline"
                        className="w-full"
                        size="icon"
                        onClick={() => {
                            refresh();
                        }}
                    >
                        <RefreshCcw className={"h-5 w-5"} />
                    </Button>
                    <Button variant="outline" className="w-full">
                        <Bookmark className="h-5 w-5" />
                    </Button>
                </div>
            </div>
            <div className="space-y-2">
                <div>
                    <span className="font-bold">License:</span> {model.license}
                </div>
                <div>
                    <span className="font-bold">Price:</span> $49.99
                </div>
                <div>
                    <span className="font-bold">Origin URL:</span>
                    <a href={model.origin} className="text-blue-500 hover:underline ml-1">
                        {model.origin}
                    </a>
                </div>
                <div>
                    <span className="font-bold">Paid:</span> Yes
                </div>
            </div>
        </div>
    );
}

function Description({ model }: { model: DetailedModelResponse }) {
    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="prose max-w-none">
                <h2 className="text-xl font-bold mb-4">Description</h2>
                <p className="mb-4">{model.title}</p>
            </div>
        </div>
    );
}

function File({ file, reload: reload }: { file: DetailedFileResponse; reload: () => void }) {
    const { toast } = useToast();
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    async function deleteFile() {
        fetch(BACKEND_BASE_URL + `/api/file/${file.id}/delete`, {
            method: "POST",
        })
            .then((response) => {
                if (!response.ok) {
                    toast({
                        title: `Deleting file "${file.name}" failed`,
                        description: `An unknown server error occurred`,
                    });
                }
                toast({
                    title: `Deleting file "${file.name}" successful`,
                    description: `It is now permanently removed`,
                });
                reload();
            })
            .catch((error) => {
                console.error("Fetch error:", error);
            });
    }

    return (
        <>
            <Card className="p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <img src={BACKEND_BASE_URL + file.preview_image} className="h-24" />
                        <div>
                            <h3 className="font-medium">{file.name}</h3>
                            <p className="text-sm text-gray-500">
                                {file.file_size} | {file.date_added ? new Date(file.date_added).toLocaleString() : ""} |{" "}
                                {file.file_hash || ""}
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline">3D Viewer</Button>
                            </DialogTrigger>

                            <DialogContent className="w-full h-full max-w-[90vw] max-h-[90vh] flex flex-col">
                                <DialogHeader>
                                    <DialogTitle className="large-text">3D Viewer: {file.name}</DialogTitle>
                                    <DialogDescription className="large-text">
                                        Pan with Right Mouse Button, Rotate with Left Mouse Button and Zoom with Scroll
                                        Wheel
                                    </DialogDescription>
                                </DialogHeader>
                                <ModelViewer file_path={file.file_path} />
                            </DialogContent>
                        </Dialog>

                        <Button
                            variant="outline"
                            className="flex items-center gap-2"
                            onClick={() => {
                                saveAs(BACKEND_BASE_URL + file.file_path, file.name);
                            }}
                        >
                            <Download size={16} />
                            Download
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger>
                                <MoreVertical className="h-5 w-5" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuLabel>File Options</DropdownMenuLabel>
                                <DropdownMenuSeparator></DropdownMenuSeparator>
                                <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)}>Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </Card>

            <AlertDialog open={isDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure to delete "{file.name}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete "{file.name}" from database and
                            filesystem.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={deleteFile}
                            className="bg-destructive hover:bg-destructive/80 text-destructive-foreground"
                        >
                            Delete
                        </AlertDialogAction>{" "}
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

function FileList({ model, reload: reload }: { model: DetailedModelResponse; reload: () => void }) {
    const files = model.files;

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-bold">Model Files</h2>
                <Button
                    variant="outline"
                    className="flex items-center gap-2"
                    onClick={() => (window.location.href = BACKEND_BASE_URL + "/api/download/" + model.package_name)}
                >
                    <Download size={16} />
                    All Files (483 KB)
                </Button>
            </div>

            <div className="space-y-4">
                {files.map((file, index) => (
                    <File file={file} key={index} reload={reload} />
                ))}
            </div>
        </div>
    );
}

function Model() {
    const { slug } = useParams();

    const [model, setModel] = useState<DetailedModelResponse>();
    const { toast } = useToast();

    async function getModel() {
        fetch(BACKEND_BASE_URL + `/api/model/${slug}`, {
            method: "GET",
        })
            .then((response) => {
                if (!response.ok) {
                    toast({
                        title: "Loading Failed",
                        description: `Loading '${model?.name}' failed`,
                    });
                }
                return response.json();
            })
            .then((response_models: DetailedModelResponse) => {
                setModel(response_models);
            })
            .catch((error) => {
                console.error("Fetch error:", error);
            });
    }

    async function refresh() {
        fetch(BACKEND_BASE_URL + `/api/model/${slug}/refresh`, {
            method: "GET",
        })
            .then((response) => {
                if (!response.ok) {
                    toast({
                        title: "Refresh Failed",
                        description: `Refreshing '${model?.name}' failed`,
                    });
                }
                toast({
                    title: "Refresh Successful",
                    description: `Refreshing '${model?.name}' successful`,
                });
                return response.json();
            })
            .then((response_models: DetailedModelResponse) => {
                setModel(response_models);
            })
            .catch((error) => {
                console.error("Fetch error:", error);
            });
    }

    useEffect(() => {
        getModel();
    }, [slug]);

    return (
        <>
            {model && (
                <div className="min-h-screen">
                    <div className="flex flex-col lg:flex-row gap-6 max-w-8xl mx-auto p-6">
                        <div className="w-full lg:w-3/5">
                            <ImageGallery model={model} />
                        </div>
                        <div className="w-full lg:w-2/5">
                            <InfoCard model={model} refresh={refresh} />
                        </div>
                    </div>
                    <Description model={model} />
                    <FileList model={model} reload={getModel} />
                </div>
            )}
        </>
    );
}

export default Model;

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Heart, MoreVertical, RefreshCcw, Bookmark } from "lucide-react";

import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { DetailedModelResponse } from "./bindings";
import { BACKEND_BASE_URL } from "./lib/api";
import { saveAs } from "file-saver";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function OptionsDropdownMenu() {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger>
                <MoreVertical className="h-5 w-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Billing</DropdownMenuItem>
                <DropdownMenuItem>Team</DropdownMenuItem>
                <DropdownMenuItem>Subscription</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function ImageGallery({ model }: { model: DetailedModelResponse }) {
    const [selectedImage, setSelectedImage] = useState(model.images[0] || undefined);

    return (
        <div className="w-full max-w-4xl">
            <Card className="mb-4">
                <CardContent className="p-0">
                    <img
                        src={`${BACKEND_BASE_URL}${selectedImage}`}
                        alt="Model Preview"
                        className="w-full h-full object-cover rounded-lg"
                    />
                </CardContent>
            </Card>

            <div className="flex gap-1 mb-1 overflow-x-auto">
                {model.images.map((img, index) => (
                    <div key={index} className="p-1">
                        <button
                            className={
                                img == selectedImage
                                    ? "flex-shrink-0 outline-none ring-2 ring-blue-500 rounded-lg"
                                    : "flex-shrink-0 rounded-lg"
                            }
                        >
                            <img
                                onClick={() => setSelectedImage(img)}
                                src={`${BACKEND_BASE_URL}${img}`}
                                alt={`Preview ${index + 1}`}
                                className="w-16 h-16 object-cover rounded-lg hover:opacity-80 transition-opacity"
                            />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

function InfoCard({ model }: { model: DetailedModelResponse }) {
    return (
        <div className="w-full max-w-lg px-1">
            <div className="flex justify-between items-start mb-6">
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold">{model.title}</h1>
                </div>
                <OptionsDropdownMenu />
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
                    <Button variant="outline" className="w-full">
                        <RefreshCcw className="h-5 w-5" />
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
                    <a href="https://example.com" className="text-blue-500 hover:underline ml-1">
                        https://example.com
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
                <p className="text-gray-700 mb-4">
                    This is a detailed description of {model.title}. It includes information about its features, use
                    cases, and any special instructions for printing or assembly. The description helps users understand
                    the model's purpose and specifications.
                </p>
                <h3 className="text-lg font-semibold mb-2">Features:</h3>
                <ul className="list-disc pl-6 mb-4">
                    <li>High-quality mesh with optimized topology</li>
                    <li>Print-ready with pre-supported options</li>
                    <li>Multiple variants included</li>
                    <li>Detailed assembly instructions</li>
                </ul>
                <h3 className="text-lg font-semibold mb-2">Printing Specifications:</h3>
                <ul className="list-disc pl-6">
                    <li>Recommended layer height: 0.2mm</li>
                    <li>Infill: 15-20%</li>
                    <li>Supports: Required</li>
                    <li>Estimated print time: 8 hours</li>
                </ul>
            </div>
        </div>
    );
}

function FileList({ model }: { model: DetailedModelResponse }) {
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
                    <Card key={index} className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <img src={BACKEND_BASE_URL + file.preview_image} className="h-24" />
                                <div>
                                    <h3 className="font-medium">{file.file_path}</h3>
                                    <p className="text-sm text-gray-500">
                                        {"2 Mb"} | {String(file.date_added) || ""} | {file.file_hash || ""}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    className="flex items-center gap-2"
                                    onClick={() => {
                                        saveAs(BACKEND_BASE_URL + file.file_path, file.file_path.split("/").pop());
                                    }}
                                >
                                    <Download size={16} />
                                    Download
                                </Button>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}

function Model() {
    const { slug } = useParams();

    const [model, setModel] = useState<DetailedModelResponse>();

    async function getModels() {
        fetch(BACKEND_BASE_URL + `/api/model/${slug}`, {
            method: "GET",
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error("Network response was not ok");
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

    useEffect(() => {
        getModels();
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
                            <InfoCard model={model} />
                        </div>
                    </div>
                    <Description model={model} />
                    <FileList model={model} />
                </div>
            )}
        </>
    );
}

export default Model;

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Heart, MoreVertical, RefreshCcw, Bookmark } from "lucide-react";

import { useState, useEffect, useRef } from "react";

function DropdownMenu() {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const toggleDropdown = () => {
        setIsOpen(!isOpen);
    };

    const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
            setIsOpen(false);
        }
    };

    useEffect(() => {
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    return (
        <div className="relative inline-block text-left" ref={dropdownRef}>
            <Button variant="ghost" size="icon" onClick={toggleDropdown}>
                <MoreVertical className="h-5 w-5" />
            </Button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg">
                    <div className="py-1">
                        <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                            Edit
                        </a>
                        <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                            Delete
                        </a>
                        <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                            Move to Library
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
}

const secondaryImages = [
    "https://media.printables.com/media/prints/1023387/images/7772651_8743bdfa-e7c7-48e3-a2dd-d66aa6c42a6c_b88c7fd6-e05f-425f-8348-8e54ec1db9d4/thumbs/inside/320x240/jpg/ducts.webp",
    "https://media.printables.com/media/prints/1023387/images/7772651_8743bdfa-e7c7-48e3-a2dd-d66aa6c42a6c_b88c7fd6-e05f-425f-8348-8e54ec1db9d4/thumbs/inside/320x240/jpg/ducts.webp",
    "https://media.printables.com/media/prints/1023387/images/7772651_8743bdfa-e7c7-48e3-a2dd-d66aa6c42a6c_b88c7fd6-e05f-425f-8348-8e54ec1db9d4/thumbs/inside/320x240/jpg/ducts.webp",
    "https://media.printables.com/media/prints/1023387/images/7772651_8743bdfa-e7c7-48e3-a2dd-d66aa6c42a6c_b88c7fd6-e05f-425f-8348-8e54ec1db9d4/thumbs/inside/320x240/jpg/ducts.webp,",
];

function Image() {
    const [selectedImage, setSelectedImage] = useState(secondaryImages[0]);

    return (
        <div className="w-full max-w-3xl">
            <Card className="mb-4">
                <CardContent className="p-0">
                    <img
                        src={selectedImage}
                        alt="Model Preview"
                        className="w-full h-[600px] object-contain bg-gray-100 rounded-lg"
                    />
                </CardContent>
            </Card>

            <div className="flex gap-1 mb-1 overflow-x-auto">
                {secondaryImages.map((img, index) => (
                    <div className="p-1">
                        <button
                            key={index}
                            onClick={() => setSelectedImage(img)}
                            className="flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
                        >
                            <img
                                src={img}
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

function InfoCard() {
    return (
        <div className="w-full max-w-lg px-1">
            <div className="flex justify-between items-start mb-6">
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold">Model</h1>
                </div>
                <DropdownMenu />
            </div>

            <div className="mb-6">
                <div className="space-y-4">
                    <div>
                        <div className="font-medium">Creator Name</div>
                        <div className="text-sm text-gray-400">@UserName</div>
                    </div>
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
                <Button size="lg" className="w-full">
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
                    <span className="font-bold">License:</span> MIT
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

function ModelTop() {
    return (
        <div className="flex flex-col lg:flex-row gap-6 max-w-6xl mx-auto p-6">
            <Image />
            <InfoCard />
        </div>
    );
}

function Description() {
    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="prose max-w-none">
                <h2 className="text-xl font-bold mb-4">Description</h2>
                <p className="text-gray-700 mb-4">
                    This is a detailed description of the 3D model. It includes information about its features, use
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

function FileList() {
    const files = [
        {
            name: "test1.step",
            size: "300 Mb",
            date: "10. Februar 2022",
            thumbnail: "🟧", // Using an emoji as placeholder
            type: "Sourcefile",
        },
        {
            name: "test2.stl",
            size: "41 kB",
            date: "10. Februar 2022",
            thumbnail: "🟧",
            type: "Mesh",
        },
        {
            name: "test3.stl",
            size: "122 kB",
            date: "10. Februar 2022",
            thumbnail: "🟧",
            type: "Mesh",
        },
    ];

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-bold">Modelldateien</h2>
                <Button variant="outline" className="flex items-center gap-2">
                    <Download size={16} />
                    Alle Dateien (483 KB)
                </Button>
            </div>

            <div className="space-y-4">
                {files.map((file, index) => (
                    <Card key={index} className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="text-4xl">{file.thumbnail}</div>
                                <div>
                                    <h3 className="font-medium">{file.name}</h3>
                                    <p className="text-sm text-gray-500">
                                        {file.size} | {file.date} | {file.type}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Button variant="outline" className="flex items-center gap-2">
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
    return (
        <div className="min-h-screen">
            <ModelTop />
            <Description />
            <FileList />
        </div>
    );
}

export default Model;

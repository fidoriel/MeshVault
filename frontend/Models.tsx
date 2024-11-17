import React, { ReactNode, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Bookmark, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "./components/ui/pagination";
import { ModelResponse, ModelResponseList } from "./bindings";
import { BACKEND_BASE_URL } from "./lib/api";
import { useTheme } from "./components/theme-provider";
import { Link } from "react-router-dom";
import { Checkbox } from "./components/ui/checkbox";

function FilterSection({ title, children }: { title: string; children: ReactNode }) {
    const [isOpen, setIsOpen] = React.useState(true);

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-2">
            <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium text-foreground">
                {title}
                {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2">{children}</CollapsibleContent>
        </Collapsible>
    );
}

export function ModelCard({ model }: { model: ModelResponse }) {
    const image = model.images && model.images.length > 0 ? `${BACKEND_BASE_URL}${model.images[0]}` : null;
    const { theme } = useTheme();
    const fillColor = theme === "dark" ? "white" : "black";
    const heart = true;
    const detail_link = `/model/${model.name}`;

    return (
        <Card className="w-full bg-background border-border hover:shadow-lg transition-shadow duration-200">
            <CardContent className="p-0 relative">
                {/* <Badge className="absolute top-2 left-2 bg-red-500 text-white">Badge</Badge> */}
                <Link to={detail_link}>
                    <img src={image || ""} alt={model.title} className="w-full h-48 object-cover rounded-t-lg" />
                </Link>
            </CardContent>
            <div className="p-3">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-muted-foreground">{model.author}</span>
                </div>
                <Link to={detail_link}>
                    <h3 className="text-sm text-foreground mb-3">{model.title}</h3>
                </Link>
                <div className="flex items-center justify-between text-muted-foreground text-sm">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                            {heart ? <Heart fill={fillColor} className="w-4 h-4" /> : <Heart className="w-4 h-4" />}
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                        <Bookmark className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </Card>
    );
}

function Models() {
    const [models, setModels] = useState<ModelResponseList>();
    const [selectedLicenses, setSelectedLicenses] = useState<string[]>([]);

    async function getModels() {
        fetch(BACKEND_BASE_URL + "/api/models/list", {
            method: "GET",
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error("Network response was not ok");
                }
                return response.json();
            })
            .then((response_models: ModelResponseList) => {
                setModels(response_models);
            })
            .catch((error) => {
                console.error("Fetch error:", error);
            });
    }

    async function filterModels() {
        const selectedLicensesString = selectedLicenses.join(",");
        const queryString = selectedLicensesString ? `?licenses=${selectedLicensesString}` : "";

        fetch(BACKEND_BASE_URL + "/api/models/list" + queryString, {
            method: "GET",
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error("Network response was not ok");
                }
                return response.json();
            })
            .then((response_models: ModelResponseList) => {
                setModels(response_models);
            })
            .catch((error) => {
                console.error("Fetch error:", error);
            });
    }

    const handleLicenseChange = (license: string) => {
        setSelectedLicenses((prevSelected) =>
            prevSelected.includes(license)
                ? prevSelected.filter((item) => item !== license)
                : [...prevSelected, license],
        );
    };

    useEffect(() => {
        getModels();
        document.title = "MeshVault";
    }, []);

    useEffect(() => {
        console.log(selectedLicenses);
        filterModels();
    }, [selectedLicenses]);

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="max-w-screen-2xl mx-auto p-3">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-3xl font-bold">Models</h1>
                </div>

                <div className="flex gap-6">
                    <div className="w-64 flex-shrink-0">
                        <div className="bg-card rounded-lg p-4 space-y-4 border border-border">
                            <FilterSection title="License">
                                <div className="space-y-2 pl-4">
                                    {models?.licenses.map((license) => (
                                        <div className="flex items-center space-x-2" key={license}>
                                            <Checkbox
                                                id={license}
                                                checked={selectedLicenses.includes(license)}
                                                onCheckedChange={() => handleLicenseChange(license)}
                                            />
                                            <label
                                                htmlFor={license}
                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                            >
                                                {license}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </FilterSection>
                        </div>
                    </div>

                    <div className="flex-1">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {models?.models.map((model, index) => <ModelCard key={index} model={model} />)}
                        </div>
                    </div>
                </div>
                <div className="pt-6">
                    <Pagination>
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious href="#" />
                            </PaginationItem>
                            <PaginationItem>
                                <PaginationLink href="#">1</PaginationLink>
                            </PaginationItem>
                            <PaginationItem>
                                <PaginationEllipsis />
                            </PaginationItem>
                            <PaginationItem>
                                <PaginationNext href="#" />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
            </div>
        </div>
    );
}

export default Models;

import React, { ReactNode, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ModelResponse, ModelResponseList } from "./bindings";
import { BACKEND_BASE_URL } from "./lib/api";
import { Link, useSearchParams } from "react-router-dom";
import { Checkbox } from "./components/ui/checkbox";
import { CollectionDropdown } from "./components/CollectionDropdown";

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
    const [favourite, setFavourite] = useState(model.favourite);
    const detail_link = `/model/${model.name}`;

    const handleLikeClick = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        try {
            const response = await fetch(BACKEND_BASE_URL + `/api/model/${model.name}/like`, {
                method: "POST",
            });
            if (response.ok) {
                const data = await response.json();
                setFavourite(data.favourite);
            }
        } catch (error) {
            console.error("Failed to toggle like:", error);
        }
    };

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
                    <Link 
                        to={`/?author=${encodeURIComponent(model.author || "")}`}
                        className="text-sm text-muted-foreground hover:text-primary hover:underline"
                    >
                        {model.author}
                    </Link>
                </div>
                <Link to={detail_link}>
                    <h3 className="text-sm text-foreground mb-3">{model.title}</h3>
                </Link>
                <div className="flex items-center justify-between text-muted-foreground text-sm">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleLikeClick}
                            className="flex items-center gap-1 hover:text-red-500 transition-colors"
                        >
                            {favourite ? (
                                <Heart fill="red" className="w-4 h-4 text-red-500" />
                            ) : (
                                <Heart className="w-4 h-4" />
                            )}
                        </button>
                    </div>
                    <CollectionDropdown modelId={model.id} />
                </div>
            </div>
        </Card>
    );
}

function Models() {
    const [searchParams] = useSearchParams();
    const authorFilter = searchParams.get("author");
    
    const [models, setModels] = useState<ModelResponse[]>([]);
    const [licenses, setLicenses] = useState<string[]>([]);
    const [selectedLicenses, setSelectedLicenses] = useState<string[]>([]);
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const observerTarget = useRef<HTMLDivElement>(null);

    const PAGE_SIZE = 1;

    const fetchModels = useCallback(
        async (pageNum: number, reset: boolean = false) => {
            if (isLoading) return;

            setIsLoading(true);
            try {
                const selectedLicensesString = selectedLicenses.join(",");
                const queryParams = new URLSearchParams({
                    page: pageNum.toString(),
                    page_size: PAGE_SIZE.toString(),
                });

                if (selectedLicensesString) {
                    queryParams.append("licenses", selectedLicensesString);
                }

                if (authorFilter) {
                    queryParams.append("author", authorFilter);
                }

                const response = await fetch(`${BACKEND_BASE_URL}/api/models/list?${queryParams.toString()}`, {
                    method: "GET",
                });

                if (!response.ok) {
                    throw new Error("Network response was not ok");
                }

                const responseModels: ModelResponseList = await response.json();

                setLicenses(responseModels.licenses);

                if (reset) {
                    setModels(responseModels.models);
                    setHasMore(responseModels.models.length === PAGE_SIZE);
                } else {
                    setModels((prevModels) => {
                        const newModels = [...prevModels, ...responseModels.models];
                        setHasMore(responseModels.models.length === PAGE_SIZE);
                        return newModels;
                    });
                }
            } catch (error) {
                console.error("Fetch error:", error);
            } finally {
                setIsLoading(false);
            }
        },
        [selectedLicenses, authorFilter, isLoading],
    );

    useEffect(() => {
        setModels([]);
        setPage(1);
        setHasMore(true);
        fetchModels(1, true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedLicenses, authorFilter]);

    useEffect(() => {
        document.title = "MeshVault";
    }, []);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !isLoading) {
                    const nextPage = page + 1;
                    setPage(nextPage);
                    fetchModels(nextPage, false);
                }
            },
            { threshold: 0.1 },
        );

        const currentTarget = observerTarget.current;
        if (currentTarget) {
            observer.observe(currentTarget);
        }

        return () => {
            if (currentTarget) {
                observer.unobserve(currentTarget);
            }
        };
    }, [hasMore, isLoading, page, fetchModels]);

    const handleLicenseChange = (license: string) => {
        setSelectedLicenses((prevSelected) =>
            prevSelected.includes(license)
                ? prevSelected.filter((item) => item !== license)
                : [...prevSelected, license],
        );
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="max-w-screen-2xl mx-auto p-3">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-3xl font-bold">
                        {authorFilter ? `Models by ${authorFilter}` : "Models"}
                    </h1>
                </div>

                <div className="flex gap-6">
                    <div className="w-64 flex-shrink-0">
                        <div className="bg-card rounded-lg p-4 space-y-4 border border-border">
                            <FilterSection title="License">
                                <div className="space-y-2 pl-4">
                                    {licenses.map((license) => (
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
                            {models.map((model, index) => (
                                <ModelCard key={index} model={model} />
                            ))}
                        </div>

                        {/* Loading indicator */}
                        {isLoading && (
                            <div className="flex justify-center items-center py-8">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        )}

                        {/* Intersection observer target */}
                        <div ref={observerTarget} className="h-4" />

                        {/* Show message when all models are loaded */}
                        {!hasMore && models.length > 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                                All models loaded ({models.length} total)
                            </div>
                        )}

                        {/* Show message when no models found */}
                        {!isLoading && models.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">No models found</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Models;
// temp change for review

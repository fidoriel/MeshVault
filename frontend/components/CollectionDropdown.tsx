import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Bookmark, Plus } from "lucide-react";
import { CollectionResponse } from "../bindings";
import { BACKEND_BASE_URL } from "../lib/api";
import { useToast } from "../hooks/use-toast";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CollectionDropdownProps {
    modelId: number;
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    size?: "default" | "sm" | "lg" | "icon";
    className?: string;
}

export function CollectionDropdown({ modelId, variant = "ghost", size = "icon", className }: CollectionDropdownProps) {
    const [collections, setCollections] = useState<CollectionResponse[]>([]);
    const [modelCollections, setModelCollections] = useState<number[]>([]);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [newCollectionName, setNewCollectionName] = useState("");
    const { toast } = useToast();

    // Check if model is in any collection
    const isInAnyCollection = modelCollections.length > 0;

    useEffect(() => {
        fetchCollections();
        fetchModelCollections();
    }, [modelId]);

    const fetchCollections = async () => {
        try {
            const response = await fetch(BACKEND_BASE_URL + "/api/collections");
            if (!response.ok) {
                throw new Error("Failed to fetch collections");
            }
            const data = await response.json();
            setCollections(data);
        } catch (error) {
            console.error("Error fetching collections:", error);
        }
    };

    const fetchModelCollections = async () => {
        try {
            const response = await fetch(BACKEND_BASE_URL + `/api/model/${modelId}/collections`);
            if (!response.ok) {
                throw new Error("Failed to fetch model collections");
            }
            const data: CollectionResponse[] = await response.json();
            setModelCollections(data.map((c) => c.id));
        } catch (error) {
            console.error("Error fetching model collections:", error);
        }
    };

    const handleToggleCollection = async (collectionId: number, isCurrentlyInCollection: boolean) => {
        if (isCurrentlyInCollection) {
            // Remove from collection
            try {
                const response = await fetch(
                    BACKEND_BASE_URL + `/api/collection/${collectionId}/remove_model/${modelId}`,
                    {
                        method: "POST",
                    },
                );

                if (!response.ok) {
                    throw new Error("Failed to remove from collection");
                }

                setModelCollections((prev) => prev.filter((id) => id !== collectionId));
                toast({
                    title: "Success",
                    description: "Removed from collection",
                });
            } catch (error) {
                console.error("Error removing from collection:", error);
                toast({
                    title: "Error",
                    description: "Failed to remove from collection",
                    variant: "destructive",
                });
            }
        } else {
            // Add to collection
            try {
                const response = await fetch(BACKEND_BASE_URL + "/api/collection/add_model", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        model_id: modelId,
                        collection_id: collectionId,
                    }),
                });

                if (!response.ok) {
                    throw new Error("Failed to add to collection");
                }

                setModelCollections((prev) => [...prev, collectionId]);
                toast({
                    title: "Success",
                    description: "Added to collection",
                });
            } catch (error) {
                console.error("Error adding to collection:", error);
                toast({
                    title: "Error",
                    description: "Failed to add to collection",
                    variant: "destructive",
                });
            }
        }
    };

    const handleCreateCollection = async () => {
        if (!newCollectionName.trim()) {
            toast({
                title: "Error",
                description: "Collection name cannot be empty",
                variant: "destructive",
            });
            return;
        }

        try {
            // Create the collection
            const createResponse = await fetch(BACKEND_BASE_URL + "/api/collections", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ name: newCollectionName.trim() }),
            });

            if (!createResponse.ok) {
                throw new Error("Failed to create collection");
            }

            const newCollection: CollectionResponse = await createResponse.json();

            // Add the model to the new collection
            const addResponse = await fetch(BACKEND_BASE_URL + "/api/collection/add_model", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model_id: modelId,
                    collection_id: newCollection.id,
                }),
            });

            if (!addResponse.ok) {
                throw new Error("Failed to add model to collection");
            }

            toast({
                title: "Success",
                description: `Collection "${newCollectionName}" created and model added`,
            });

            setNewCollectionName("");
            setCreateDialogOpen(false);
            fetchCollections();
            fetchModelCollections();
        } catch (error) {
            console.error("Error creating collection:", error);
            toast({
                title: "Error",
                description: "Failed to create collection",
                variant: "destructive",
            });
        }
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant={variant}
                        size={size}
                        className={className || "text-muted-foreground hover:text-foreground"}
                    >
                        {isInAnyCollection ? (
                            <Bookmark className="w-4 h-4" fill="currentColor" />
                        ) : (
                            <Bookmark className="w-4 h-4" />
                        )}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Add to Collection</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {collections.length === 0 ? (
                        <div className="px-2 py-1 text-sm text-muted-foreground">No collections yet</div>
                    ) : (
                        collections.map((collection) => (
                            <DropdownMenuCheckboxItem
                                key={collection.id}
                                checked={modelCollections.includes(collection.id)}
                                onCheckedChange={() =>
                                    handleToggleCollection(collection.id, modelCollections.includes(collection.id))
                                }
                            >
                                {collection.name}
                            </DropdownMenuCheckboxItem>
                        ))
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setCreateDialogOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create New Collection
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Collection</DialogTitle>
                        <DialogDescription>
                            Enter a name for your new collection. The model will be added to it automatically.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="collection-name" className="text-right">
                                Name
                            </Label>
                            <Input
                                id="collection-name"
                                value={newCollectionName}
                                onChange={(e) => setNewCollectionName(e.target.value)}
                                className="col-span-3"
                                placeholder="My Collection"
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        handleCreateCollection();
                                    }
                                }}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleCreateCollection}>Create & Add</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

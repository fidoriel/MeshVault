import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { CollectionResponse, DetailedCollectionResponse } from "./bindings";
import { BACKEND_BASE_URL } from "./lib/api";
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
import { useToast } from "./hooks/use-toast";
import { ModelCard } from "./Models";

function CollectionCard({
    collection,
    onEdit,
    onDelete,
    onViewDetails,
}: {
    collection: CollectionResponse;
    onEdit: () => void;
    onDelete: () => void;
    onViewDetails: () => void;
}) {
    const imageCount = collection.preview_images.length;

    return (
        <Card className="w-full bg-background border-border hover:shadow-lg transition-shadow duration-200">
            <CardContent className="p-0 relative">
                {/* Image Grid Preview */}
                {imageCount > 0 ? (
                    <div
                        className="w-full h-48 grid gap-0.5 cursor-pointer"
                        style={{
                            gridTemplateColumns: imageCount === 1 ? "1fr" : "1fr 1fr",
                            gridTemplateRows: imageCount <= 2 ? "1fr" : "1fr 1fr",
                        }}
                        onClick={onViewDetails}
                    >
                        {collection.preview_images.slice(0, 4).map((img, idx) => (
                            <div
                                key={idx}
                                className="relative overflow-hidden bg-muted"
                                style={{
                                    gridColumn: imageCount === 1 ? "1 / -1" : "auto",
                                    gridRow: imageCount === 1 ? "1 / -1" : "auto",
                                }}
                            >
                                <img src={`${BACKEND_BASE_URL}${img}`} alt="" className="w-full h-full object-cover" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div
                        className="w-full h-48 flex items-center justify-center bg-muted cursor-pointer"
                        onClick={onViewDetails}
                    >
                        <p className="text-muted-foreground text-sm">No models</p>
                    </div>
                )}
            </CardContent>
            <div className="p-4">
                <div className="flex items-start justify-between">
                    <div className="flex-1" onClick={onViewDetails} style={{ cursor: "pointer" }}>
                        <h3 className="text-lg font-semibold text-foreground mb-1">{collection.name}</h3>
                        <p className="text-sm text-muted-foreground">{collection.model_count} models</p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit();
                            }}
                        >
                            <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete();
                            }}
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </Card>
    );
}

function CreateCollectionDialog({
    open,
    onOpenChange,
    onCreate,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreate: () => void;
}) {
    const [name, setName] = useState("");
    const { toast } = useToast();

    const handleCreate = async () => {
        if (!name.trim()) {
            toast({
                title: "Error",
                description: "Collection name cannot be empty",
                variant: "destructive",
            });
            return;
        }

        try {
            const response = await fetch(BACKEND_BASE_URL + "/api/collections", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ name: name.trim() }),
            });

            if (!response.ok) {
                throw new Error("Failed to create collection");
            }

            toast({
                title: "Success",
                description: `Collection "${name}" created successfully`,
            });

            setName("");
            onOpenChange(false);
            onCreate();
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
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create New Collection</DialogTitle>
                    <DialogDescription>Enter a name for your new collection.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                            Name
                        </Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="col-span-3"
                            placeholder="My Collection"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleCreate}>Create Collection</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function EditCollectionDialog({
    collection,
    open,
    onOpenChange,
    onUpdate,
}: {
    collection: CollectionResponse | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdate: () => void;
}) {
    const [name, setName] = useState("");
    const { toast } = useToast();

    useEffect(() => {
        if (collection) {
            setName(collection.name);
        }
    }, [collection]);

    const handleUpdate = async () => {
        if (!collection) return;

        if (!name.trim()) {
            toast({
                title: "Error",
                description: "Collection name cannot be empty",
                variant: "destructive",
            });
            return;
        }

        try {
            const response = await fetch(BACKEND_BASE_URL + `/api/collection/${collection.id}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ name: name.trim() }),
            });

            if (!response.ok) {
                throw new Error("Failed to update collection");
            }

            toast({
                title: "Success",
                description: `Collection renamed to "${name}"`,
            });

            onOpenChange(false);
            onUpdate();
        } catch (error) {
            console.error("Error updating collection:", error);
            toast({
                title: "Error",
                description: "Failed to update collection",
                variant: "destructive",
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Collection</DialogTitle>
                    <DialogDescription>Change the collection name.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-name" className="text-right">
                            Name
                        </Label>
                        <Input
                            id="edit-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="col-span-3"
                            placeholder="My Collection"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleUpdate}>Save Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function CollectionDetailsDialog({
    collectionId,
    open,
    onOpenChange,
}: {
    collectionId: number | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const [collection, setCollection] = useState<DetailedCollectionResponse | null>(null);

    useEffect(() => {
        if (collectionId && open) {
            fetchCollectionDetails();
        }
    }, [collectionId, open]);

    const fetchCollectionDetails = async () => {
        if (!collectionId) return;

        try {
            const response = await fetch(BACKEND_BASE_URL + `/api/collection/${collectionId}`);
            if (!response.ok) {
                throw new Error("Failed to fetch collection details");
            }
            const data = await response.json();
            setCollection(data);
        } catch (error) {
            console.error("Error fetching collection details:", error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{collection?.name || "Collection"}</DialogTitle>
                    <DialogDescription>{collection?.models.length || 0} models in this collection</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-4">
                    {collection?.models.map((model) => <ModelCard key={model.id} model={model} />)}
                </div>
            </DialogContent>
        </Dialog>
    );
}

function Collections() {
    const [collections, setCollections] = useState<CollectionResponse[]>([]);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
    const [selectedCollection, setSelectedCollection] = useState<CollectionResponse | null>(null);
    const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [collectionToDelete, setCollectionToDelete] = useState<CollectionResponse | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        fetchCollections();
        document.title = "Collections - MeshVault";
    }, []);

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
            toast({
                title: "Error",
                description: "Failed to load collections",
                variant: "destructive",
            });
        }
    };

    const handleEdit = (collection: CollectionResponse) => {
        setSelectedCollection(collection);
        setEditDialogOpen(true);
    };

    const handleDelete = (collection: CollectionResponse) => {
        setCollectionToDelete(collection);
        setDeleteDialogOpen(true);
    };

    const handleViewDetails = (collection: CollectionResponse) => {
        setSelectedCollectionId(collection.id);
        setDetailsDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!collectionToDelete) return;

        try {
            const response = await fetch(BACKEND_BASE_URL + `/api/collection/${collectionToDelete.id}/delete`, {
                method: "POST",
            });

            if (!response.ok) {
                throw new Error("Failed to delete collection");
            }

            toast({
                title: "Success",
                description: `Collection "${collectionToDelete.name}" deleted successfully`,
            });

            setDeleteDialogOpen(false);
            setCollectionToDelete(null);
            fetchCollections();
        } catch (error) {
            console.error("Error deleting collection:", error);
            toast({
                title: "Error",
                description: "Failed to delete collection",
                variant: "destructive",
            });
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="max-w-screen-2xl mx-auto p-3">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-3xl font-bold">Collections</h1>
                    <Button onClick={() => setCreateDialogOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        New Collection
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {collections.map((collection) => (
                        <CollectionCard
                            key={collection.id}
                            collection={collection}
                            onEdit={() => handleEdit(collection)}
                            onDelete={() => handleDelete(collection)}
                            onViewDetails={() => handleViewDetails(collection)}
                        />
                    ))}
                </div>

                {collections.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground mb-4">No collections yet. Create your first collection!</p>
                        <Button onClick={() => setCreateDialogOpen(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Create Collection
                        </Button>
                    </div>
                )}
            </div>

            <CreateCollectionDialog
                open={createDialogOpen}
                onOpenChange={setCreateDialogOpen}
                onCreate={fetchCollections}
            />

            <EditCollectionDialog
                collection={selectedCollection}
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                onUpdate={fetchCollections}
            />

            <CollectionDetailsDialog
                collectionId={selectedCollectionId}
                open={detailsDialogOpen}
                onOpenChange={setDetailsDialogOpen}
            />

            <AlertDialog open={deleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Collection</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{collectionToDelete?.name}"? This will not delete the
                            models in the collection, only the collection itself.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-destructive hover:bg-destructive/80 text-destructive-foreground"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

export default Collections;

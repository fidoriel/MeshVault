import { useEffect, useState } from "react";
import { ModelResponseList } from "./bindings";
import { BACKEND_BASE_URL } from "./lib/api";
import { ModelCard } from "./Models";

function FavouriteModels() {
    const [models, setModels] = useState<ModelResponseList>();

    async function getFavouriteModels() {
        fetch(BACKEND_BASE_URL + "/api/models/list?favourite=true", {
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

    useEffect(() => {
        getFavouriteModels();
        document.title = "Favourite Models - MeshVault";
    }, []);

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="max-w-screen-2xl mx-auto p-3">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-3xl font-bold">Favourite Models</h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {models?.models.length === 0 ? (
                        <div className="col-span-full text-center text-muted-foreground py-12">
                            No Favourite models yet. Start exploring and like some models!
                        </div>
                    ) : (
                        models?.models.map((model, index) => <ModelCard key={index} model={model} />)
                    )}
                </div>
            </div>
        </div>
    );
}

export default FavouriteModels;

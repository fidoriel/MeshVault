import { useEffect } from "react";
import { useState } from "react";
import { ModelResponseList } from "./bindings";
import { BACKEND_BASE_URL } from "./lib/api";
import { ModelCard } from "./Models";

function SearchView({ searchValue, setSearchValue }: { searchValue: string; setSearchValue: (value: string) => void }) {
    const [models, setModels] = useState<ModelResponseList>();

    async function getModels() {
        fetch(BACKEND_BASE_URL + "/api/models/list?q=" + searchValue, {
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
        getModels();
        document.title = "Search: " + searchValue;
    }, [searchValue]);

    useEffect(() => {
        return () => {
            setSearchValue("");
        };
    }, []);

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="max-w-screen-2xl mx-auto p-3">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-3xl font-bold">Search</h1>
                </div>
                <div className="flex-1">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {searchValue.length < 3 ? (
                            <div className="col-span-full text-center">Please enter at least 3 characters</div>
                        ) : models ? (
                            models?.models.map((model, index) => <ModelCard key={index} model={model} />)
                        ) : (
                            <div className="col-span-full text-center">No results found</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SearchView;

import { useEffect } from "react";

function NotFound() {
    useEffect(() => {
        document.title = "404 Not Found - MeshVault";
    }, []);

    return (
        <div className="flex items-center justify-center h-screen">
            <h1 className="text-4xl font-bold">404 - Page Not Found</h1>
        </div>
    );
}

export default NotFound;

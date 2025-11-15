import { ModeToggle } from "./components/mode-toggle";
import Model from "./Model";
import { Search } from "./components/search";
import { ThemeProvider, useTheme } from "./components/theme-provider";
import Models from "./Models";
import Collections from "./Collections";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { RefreshCcw, Upload } from "lucide-react";
import { useState } from "react";

import { NavLink } from "react-router-dom";
import { Button } from "./components/ui/button";
import { BACKEND_BASE_URL } from "./lib/api";
import AboutModelPack from "./ModelPack";
import UploadModel from "./UploadModel";
import { Toaster } from "./components/ui/toaster";
import EditModel from "./EditModel";
import SearchView from "./SearchView";
import NotFound from "./NotFound";
import FavouriteModels from "./FavouriteModels";

const getFillColor = (theme: string) => {
    if (theme === "system") {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        return prefersDark ? "white" : "black";
    }
    return theme === "dark" ? "white" : "black";
};

function GitHubButton() {
    const { theme } = useTheme();
    return (
        <Button variant="outline" size="icon">
            <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <title>GitHub</title>
                <path
                    fill={getFillColor(theme)}
                    d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
                />
            </svg>
        </Button>
    );
}

const ACTIVE_NAV = "text-sm font-medium text-primary";
const NON_ACTIVE_NAV = "text-sm font-medium text-muted-foreground transition-colors hover:text-primary";

function Refresh() {
    const [loading, setLoading] = useState(false);

    async function handleRefresh() {
        setLoading(true);
        try {
            const response = await fetch(BACKEND_BASE_URL + "/api/refresh", {
                method: "POST",
            });
            if (!response.ok) {
                throw new Error("Network response was not ok");
            }
        } catch (error) {
            console.error("Fetch error:", error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Button variant="outline" size="icon" onClick={handleRefresh} disabled={loading}>
            <RefreshCcw className={loading ? "spin-left" : ""} />
        </Button>
    );
}

function Navbar({ searchValue, setSearchValue }: { searchValue: string; setSearchValue: (value: string) => void }) {
    return (
        <div className="sticky top-0 w-full border-b shadow-sm bg-background z-50">
            <div className="container mx-auto flex h-16 items-center px-4">
                <nav className="flex items-center space-x-4 lg:space-x-6">
                    <NavLink to="/" className={({ isActive }) => (isActive ? ACTIVE_NAV : NON_ACTIVE_NAV)}>
                        Home
                    </NavLink>
                    <NavLink to="/favourite" className={({ isActive }) => (isActive ? ACTIVE_NAV : NON_ACTIVE_NAV)}>
                        <span className="flex items-center gap-1">Favourites</span>
                    </NavLink>
                    <NavLink to="/collections" className={({ isActive }) => (isActive ? ACTIVE_NAV : NON_ACTIVE_NAV)}>
                        Collections
                    </NavLink>
                    <NavLink to="/modelpack" className={({ isActive }) => (isActive ? ACTIVE_NAV : NON_ACTIVE_NAV)}>
                        About ModelPack
                    </NavLink>
                </nav>
                <div className="ml-auto flex items-center space-x-4">
                    <Search setSearchValue={setSearchValue} searchValue={searchValue} />
                    <ModeToggle />
                    <Link to="/upload">
                        <Button variant="outline" size="icon">
                            <Upload />
                        </Button>
                    </Link>
                    <Refresh />
                    <Link to="https://github.com/fidoriel/MeshVault" target="_blank">
                        <GitHubButton />
                    </Link>
                </div>
            </div>
        </div>
    );
}

function App() {
    const [searchValue, setSearchValue] = useState("");

    return (
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
            <BrowserRouter>
                <Navbar setSearchValue={setSearchValue} searchValue={searchValue} />
                <div className="container mx-auto py-6">
                    <Routes>
                        <Route path="/" element={<Models />} />
                        <Route path="/collections" element={<Collections />} />
                        <Route path="/upload" element={<UploadModel />} />
                        <Route path="/model/:slug" element={<Model />} />
                        <Route path="/model/:slug/edit" element={<EditModel />} />
                        <Route path="/modelpack" element={<AboutModelPack />} />
                        <Route path="/favourite" element={<FavouriteModels />} />
                        <Route
                            path="/search"
                            element={<SearchView searchValue={searchValue} setSearchValue={setSearchValue} />}
                        />
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                </div>
            </BrowserRouter>
            <Toaster />
        </ThemeProvider>
    );
}

export default App;

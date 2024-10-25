import { ModeToggle } from "./components/mode-toggle";
import Model from "./Model";
import { Search } from "./components/search";
import { ThemeProvider } from "./components/theme-provider";
import Models from "./Models";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { RefreshCcw, Upload } from "lucide-react";
import { useState } from "react";

import { NavLink } from "react-router-dom";
import { Button } from "./components/ui/button";
import { LoadingSpinner } from "./components/custom-ui/spinner";
import { BACKEND_BASE_URL } from "./lib/api";

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
            {loading ? <LoadingSpinner size={1} /> : <RefreshCcw />}
        </Button>
    );
}

function Navbar() {
    return (
        <div className="sticky top-0 w-full border-b shadow-sm bg-background z-50">
            <div className="container mx-auto flex h-16 items-center px-4">
                <nav className="flex items-center space-x-4 lg:space-x-6">
                    <NavLink to="/" className={({ isActive }) => (isActive ? ACTIVE_NAV : NON_ACTIVE_NAV)}>
                        Home
                    </NavLink>
                    <NavLink to="/collections" className={({ isActive }) => (isActive ? ACTIVE_NAV : NON_ACTIVE_NAV)}>
                        Collections
                    </NavLink>
                    <NavLink to="/libraries" className={({ isActive }) => (isActive ? ACTIVE_NAV : NON_ACTIVE_NAV)}>
                        Libraries
                    </NavLink>
                    <NavLink to="/settings" className={({ isActive }) => (isActive ? ACTIVE_NAV : NON_ACTIVE_NAV)}>
                        Settings
                    </NavLink>
                </nav>
                <div className="ml-auto flex items-center space-x-4">
                    <Search />
                    <ModeToggle />
                    <Button variant="outline" size="icon">
                        <Upload />
                    </Button>
                    <Refresh />
                </div>
            </div>
        </div>
    );
}

function App() {
    return (
        <>
            <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
                <BrowserRouter>
                    <Navbar />
                    <div className="container mx-auto py-6">
                        <Routes>
                            <Route path="/" element={<Models />} />
                            <Route path="/model/:slug" element={<Model />} />
                        </Routes>
                    </div>
                </BrowserRouter>
            </ThemeProvider>
        </>
    );
}

export default App;

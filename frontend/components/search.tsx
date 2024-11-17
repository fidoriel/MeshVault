import { useNavigate } from "react-router-dom";
import { Input } from "./ui/input";

export function Search({
    searchValue,
    setSearchValue,
}: {
    searchValue: string;
    setSearchValue: (value: string) => void;
}) {
    const navigate = useNavigate();
    function onSearchClick() {
        navigate("/search");
    }

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setSearchValue(value);
    };

    return (
        <div>
            <Input
                type="search"
                placeholder="Search..."
                className="md:w-[100px] lg:w-[300px]"
                onClick={onSearchClick}
                value={searchValue}
                onChange={handleInputChange}
            />
        </div>
    );
}

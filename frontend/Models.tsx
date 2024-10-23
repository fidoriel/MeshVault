import React, { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Bookmark, ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./components/ui/pagination";

interface Model {
  title: string;
  author: string;
  image: string;
  liked: boolean;
  collected: boolean;
}

const sampleModels: Model[] = [
  {
    title: "Test1",
    author: "Author1",
    image:
      "https://media.printables.com/media/prints/1023387/images/7772651_8743bdfa-e7c7-48e3-a2dd-d66aa6c42a6c_b88c7fd6-e05f-425f-8348-8e54ec1db9d4/thumbs/inside/320x240/jpg/ducts.webp",
    liked: true,
    collected: true,
  },
  {
    title: "Test1",
    author: "Author1",
    image:
      "https://media.printables.com/media/prints/1023387/images/7772651_8743bdfa-e7c7-48e3-a2dd-d66aa6c42a6c_b88c7fd6-e05f-425f-8348-8e54ec1db9d4/thumbs/inside/320x240/jpg/ducts.webp",
    liked: true,
    collected: true,
  },
  {
    title: "Test1",
    author: "Author1",
    image:
      "https://media.printables.com/media/prints/1023387/images/7772651_8743bdfa-e7c7-48e3-a2dd-d66aa6c42a6c_b88c7fd6-e05f-425f-8348-8e54ec1db9d4/thumbs/inside/320x240/jpg/ducts.webp",
    liked: true,
    collected: true,
  },
  {
    title: "Test1",
    author: "Author1",
    image:
      "https://media.printables.com/media/prints/1023387/images/7772651_8743bdfa-e7c7-48e3-a2dd-d66aa6c42a6c_b88c7fd6-e05f-425f-8348-8e54ec1db9d4/thumbs/inside/320x240/jpg/ducts.webp",
    liked: true,
    collected: true,
  },
  {
    title: "Test1",
    author: "Author1",
    image:
      "https://media.printables.com/media/prints/1023387/images/7772651_8743bdfa-e7c7-48e3-a2dd-d66aa6c42a6c_b88c7fd6-e05f-425f-8348-8e54ec1db9d4/thumbs/inside/320x240/jpg/ducts.webp",
    liked: true,
    collected: true,
  },
  {
    title: "Test1",
    author: "Author1",
    image:
      "https://media.printables.com/media/prints/1023387/images/7772651_8743bdfa-e7c7-48e3-a2dd-d66aa6c42a6c_b88c7fd6-e05f-425f-8348-8e54ec1db9d4/thumbs/inside/320x240/jpg/ducts.webp",
    liked: true,
    collected: true,
  },
  {
    title: "Test1",
    author: "Author1",
    image:
      "https://media.printables.com/media/prints/1023387/images/7772651_8743bdfa-e7c7-48e3-a2dd-d66aa6c42a6c_b88c7fd6-e05f-425f-8348-8e54ec1db9d4/thumbs/inside/320x240/jpg/ducts.webp",
    liked: true,
    collected: true,
  },
  {
    title: "Test1",
    author: "Author1",
    image:
      "https://media.printables.com/media/prints/1023387/images/7772651_8743bdfa-e7c7-48e3-a2dd-d66aa6c42a6c_b88c7fd6-e05f-425f-8348-8e54ec1db9d4/thumbs/inside/320x240/jpg/ducts.webp",
    liked: true,
    collected: true,
  },
  {
    title: "Test1",
    author: "Author1",
    image:
      "https://media.printables.com/media/prints/1023387/images/7772651_8743bdfa-e7c7-48e3-a2dd-d66aa6c42a6c_b88c7fd6-e05f-425f-8348-8e54ec1db9d4/thumbs/inside/320x240/jpg/ducts.webp",
    liked: true,
    collected: true,
  },
  {
    title: "Test1",
    author: "Author1",
    image:
      "https://media.printables.com/media/prints/1023387/images/7772651_8743bdfa-e7c7-48e3-a2dd-d66aa6c42a6c_b88c7fd6-e05f-425f-8348-8e54ec1db9d4/thumbs/inside/320x240/jpg/ducts.webp",
    liked: true,
    collected: true,
  },
  {
    title: "Test1",
    author: "Author1",
    image:
      "https://media.printables.com/media/prints/1023387/images/7772651_8743bdfa-e7c7-48e3-a2dd-d66aa6c42a6c_b88c7fd6-e05f-425f-8348-8e54ec1db9d4/thumbs/inside/320x240/jpg/ducts.webp",
    liked: true,
    collected: true,
  },
  {
    title: "Test1",
    author: "Author1",
    image:
      "https://media.printables.com/media/prints/1023387/images/7772651_8743bdfa-e7c7-48e3-a2dd-d66aa6c42a6c_b88c7fd6-e05f-425f-8348-8e54ec1db9d4/thumbs/inside/320x240/jpg/ducts.webp",
    liked: true,
    collected: true,
  },
];

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = React.useState(true);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-2">
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium text-foreground">
        {title}
        {isOpen ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2">{children}</CollapsibleContent>
    </Collapsible>
  );
}

function ModelCard({ model }: { model: Model }) {
  return (
    <Card className="w-full bg-background border-border hover:shadow-lg transition-shadow duration-200">
      <CardContent className="p-0 relative">
        <Badge className="absolute top-2 left-2 bg-red-500 text-white">
          Badge
        </Badge>
        <img
          src={model.image}
          alt={model.title}
          className="w-full h-48 object-cover rounded-t-lg"
        />
      </CardContent>
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm text-muted-foreground">{model.author}</span>
        </div>
        <h3 className="text-sm text-foreground mb-3">{model.title}</h3>
        <div className="flex items-center justify-between text-muted-foreground text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              {model.liked ? (
                <Heart fill="black" className="w-4 h-4" />
              ) : (
                <Heart className="w-4 h-4" />
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
          >
            <Bookmark className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

const Models = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-screen-2xl mx-auto p-3">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Models</h1>
        </div>

        <div className="flex gap-6">
          <div className="w-64 flex-shrink-0">
            <div className="bg-card rounded-lg p-4 space-y-4 border border-border">
              <FilterSection title="Categories">
                <div className="space-y-2 pl-4">
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-sm"
                  >
                    Tabletop
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-sm"
                  >
                    Calibration
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-sm"
                  >
                    Tools
                  </Button>
                </div>
              </FilterSection>

              <FilterSection title="License">
                <Select>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="GPL" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">GPL</SelectItem>
                    <SelectItem value="2">MIT</SelectItem>
                    <SelectItem value="3">paid</SelectItem>
                  </SelectContent>
                </Select>
              </FilterSection>
            </div>
          </div>

          <div className="flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {sampleModels.map((model, index) => (
                <ModelCard key={index} model={model} />
              ))}
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
};

export default Models;

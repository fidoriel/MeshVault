import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const AboutModelPack = () => {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="max-w-screen-2xl mx-auto p-6">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-4xl font-bold">About the ModelPack Format</h1>
                </div>

                <div className="space-y-6">
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle>File System First Approach</CardTitle>
                            <CardDescription>
                                This platform is designed around the 'modelpack' file format. The database is only used
                                for caching the information from the file system. If a change is made through the UI,
                                the corresponding 'modelpack' will also be changed. This keeps the 3D fies independent
                                from any platform and easily accessible via file systems. The database is filled with
                                data from the file system. Previews and other complementary information can be managed
                                via UI.
                            </CardDescription>
                        </CardHeader>
                        <CardContent></CardContent>
                    </Card>
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle>Directory Structure</CardTitle>
                            <CardDescription>Standard ModelPack file organization</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                                {`my_model.zip/
├── modelpack.json
├── README.md
├── LICENSE.md
├── files/
│ ├── model1.obj
│ ├── model2.stl
│ └── special_version_subdir/
│   ├── model3.3mf
│   ├── model3.step
├── preview/
│ ├── model1.obj.png
│ ├── model2.stl.png
│ └── special_version_subdir/
│   ├── model3.3mf.png
│   ├── model3.step.png
├── images/
│ ├── nice_print.png
│ └── nice_multicolor_print.jpg
└── assets/
  ├── readme.txt
  └── license.pdf`}
                            </pre>
                        </CardContent>
                    </Card>

                    {/* JSON Schema Card */}
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle>JSON Schema</CardTitle>
                            <CardDescription>ModelPack format specification</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                                {`{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "ModelPackV0_1",
  "type": "object",
  "properties": {
    "version": {
      "type": "string",
      "description": "The version of the ModelPack format."
    },
    "title": {
      "type": "string",
      "description": "The title of the ModelPack."
    },
    "author": {
      "type": "string",
      "description": "The author of the ModelPack."
    },
    "origin": {
      "type": "string",
      "description": "The origin URL of the ModelPack."
    },
    "license": {
      "type": "string",
      "description": "The license under which the ModelPack is distributed."
    }
  },
  "required": ["version", "title", "author", "origin", "license"]
}`}
                            </pre>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default AboutModelPack;

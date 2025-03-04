
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Download, Share2, Trash } from "lucide-react";
import { ModelVersion } from "@/ml/modelVersioning";

interface ModelVersionsTableProps {
  versions: ModelVersion[];
  onLoadModel: (modelId: string) => void;
  onDeleteModel?: (modelId: string) => void;
  onExportModel?: (modelId: string) => void;
}

const ModelVersionsTable = ({ 
  versions, 
  onLoadModel, 
  onDeleteModel, 
  onExportModel 
}: ModelVersionsTableProps) => {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-md font-medium">Model Versions</CardTitle>
      </CardHeader>
      <CardContent>
        {versions.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            No saved models found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Version</TableHead>
                  <TableHead>Accuracy</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {versions.map((version) => (
                  <TableRow key={version.id}>
                    <TableCell className="font-medium">{version.version}</TableCell>
                    <TableCell>{version.accuracy.toFixed(1)}%</TableCell>
                    <TableCell>
                      {format(new Date(version.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => onLoadModel(version.id)}
                      >
                        Load
                      </Button>
                      
                      {onExportModel && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => onExportModel(version.id)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {onDeleteModel && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => onDeleteModel(version.id)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ModelVersionsTable;

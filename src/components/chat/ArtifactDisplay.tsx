import React from 'react';
import { Artifact, Part } from '@/a2a/schema';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Database, Download } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';

interface ArtifactDisplayProps {
  artifact: Artifact;
}

interface PartDisplayProps {
  part: Part;
  index: number;
}

// Компонент для отображения file part в Card обёртке
const FilePartDisplay: React.FC<{ part: Part & { kind: 'file' }; index: number }> = ({
  part,
  index,
}) => {
  return (
    <Card className="border-l-4 border-l-green-500">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Download className="h-4 w-4" />
          File: {part.file.name || `File ${index + 1}`}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="bg-muted/50 rounded-md p-3">
          {part.file.mimeType && (
            <div className="text-sm">
              <strong>Type:</strong> {part.file.mimeType}
            </div>
          )}
          {'uri' in part.file ? (
            <div className="text-sm">
              <strong>URL:</strong>{' '}
              <a
                href={part.file.uri}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {part.file.uri}
              </a>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              File content available as base64 data ({part.file.bytes.length} chars)
            </div>
          )}
        </div>
        {part.metadata && Object.keys(part.metadata).length > 0 && (
          <div className="text-xs text-muted-foreground">
            <strong>Metadata:</strong> {JSON.stringify(part.metadata, null, 2)}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Компонент для отображения data part в Card обёртке
const DataPartDisplay: React.FC<{ part: Part & { kind: 'data' }; index: number }> = ({
  part,
  index,
}) => {
  return (
    <Card className="border-l-4 border-l-purple-500">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Database className="h-4 w-4" />
          Data {index + 1}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="bg-muted/50 rounded-md p-3">
          <pre className="text-xs whitespace-pre-wrap break-words">
            {JSON.stringify(part.data, null, 2)}
          </pre>
        </div>
        {part.metadata && Object.keys(part.metadata).length > 0 && (
          <div className="text-xs text-muted-foreground">
            <strong>Metadata:</strong> {JSON.stringify(part.metadata, null, 2)}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const PartDisplay: React.FC<PartDisplayProps> = ({ part, index }) => {
  switch (part.kind) {
    case 'text':
      // Текстовые части отображаем как markdown напрямую (без Card обёртки)
      // Они будут объединены с основным контентом
      return null;

    case 'file':
      return <FilePartDisplay part={part} index={index} />;

    case 'data':
      return <DataPartDisplay part={part} index={index} />;

    default:
      return (
        <div className="text-sm text-muted-foreground">Unknown part type: {(part as any).kind}</div>
      );
  }
};

export const ArtifactDisplay: React.FC<ArtifactDisplayProps> = ({ artifact }) => {
  // Разделяем parts на текстовые и нетекстовые
  const textParts = artifact.parts.filter(part => part.kind === 'text');
  const nonTextParts = artifact.parts.filter(part => part.kind !== 'text');

  // Объединяем весь текст из текстовых частей
  const combinedText = textParts
    .map(part => (part as any).text)
    .filter(Boolean)
    .join('\n\n');

  // Если есть только текстовые части - показываем markdown напрямую без Card
  if (nonTextParts.length === 0 && combinedText) {
    return (
      <div className="mt-2">
        <MarkdownRenderer content={combinedText} />
      </div>
    );
  }

  // Если есть нетекстовые части - показываем их в Card обёртках
  return (
    <div className="mt-2 space-y-2">
      {/* Текстовые части показываем как markdown */}
      {combinedText && <MarkdownRenderer content={combinedText} />}

      {/* Нетекстовые части показываем в Card обёртках */}
      {nonTextParts.map((part, index) => (
        <PartDisplay key={index} part={part} index={index} />
      ))}

      {/* Метаданные артефакта */}
      {artifact.metadata && Object.keys(artifact.metadata).length > 0 && (
        <div className="text-xs text-muted-foreground border-t pt-2">
          <strong>Artifact Metadata:</strong>
          <pre className="mt-1 whitespace-pre-wrap">
            {JSON.stringify(artifact.metadata, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

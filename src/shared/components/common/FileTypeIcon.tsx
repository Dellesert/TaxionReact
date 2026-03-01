import React from 'react';
import Svg, { Path, Rect, Text as SvgText } from 'react-native-svg';

interface FileTypeIconProps {
  fileName: string;
  size?: number;
}

interface FileTypeConfig {
  color: string;
  label: string;
}

const FILE_TYPE_MAP: Record<string, FileTypeConfig> = {
  // PDF
  pdf: { color: '#E5252A', label: 'PDF' },
  // Word
  doc: { color: '#2B579A', label: 'DOC' },
  docx: { color: '#2B579A', label: 'DOC' },
  // Excel
  xls: { color: '#217346', label: 'XLS' },
  xlsx: { color: '#217346', label: 'XLS' },
  csv: { color: '#217346', label: 'CSV' },
  // PowerPoint
  ppt: { color: '#D24726', label: 'PPT' },
  pptx: { color: '#D24726', label: 'PPT' },
  // Archives
  zip: { color: '#F0A030', label: 'ZIP' },
  rar: { color: '#F0A030', label: 'RAR' },
  '7z': { color: '#F0A030', label: '7Z' },
  tar: { color: '#F0A030', label: 'TAR' },
  gz: { color: '#F0A030', label: 'GZ' },
  // Text
  txt: { color: '#6B7280', label: 'TXT' },
  rtf: { color: '#6B7280', label: 'RTF' },
  // Audio
  mp3: { color: '#8B5CF6', label: 'MP3' },
  wav: { color: '#8B5CF6', label: 'WAV' },
  ogg: { color: '#8B5CF6', label: 'OGG' },
  flac: { color: '#8B5CF6', label: 'FLAC' },
  m4a: { color: '#8B5CF6', label: 'M4A' },
  aac: { color: '#8B5CF6', label: 'AAC' },
  // Code
  js: { color: '#F7DF1E', label: 'JS' },
  ts: { color: '#3178C6', label: 'TS' },
  jsx: { color: '#61DAFB', label: 'JSX' },
  tsx: { color: '#3178C6', label: 'TSX' },
  py: { color: '#3776AB', label: 'PY' },
  java: { color: '#ED8B00', label: 'JAVA' },
  go: { color: '#00ADD8', label: 'GO' },
  rb: { color: '#CC342D', label: 'RB' },
  php: { color: '#777BB4', label: 'PHP' },
  json: { color: '#292929', label: 'JSON' },
  xml: { color: '#F16529', label: 'XML' },
  html: { color: '#E34F26', label: 'HTML' },
  css: { color: '#1572B6', label: 'CSS' },
  // Other
  apk: { color: '#3DDC84', label: 'APK' },
  exe: { color: '#00599C', label: 'EXE' },
  dmg: { color: '#9CA3AF', label: 'DMG' },
  iso: { color: '#9CA3AF', label: 'ISO' },
  svg: { color: '#FFB13B', label: 'SVG' },
};

const DEFAULT_CONFIG: FileTypeConfig = { color: '#9CA3AF', label: '' };

const getConfig = (fileName: string): FileTypeConfig => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return FILE_TYPE_MAP[ext] || { ...DEFAULT_CONFIG, label: ext.toUpperCase().slice(0, 4) };
};

export const FileTypeIcon: React.FC<FileTypeIconProps> = React.memo(({ fileName, size = 24 }) => {
  const { color, label } = getConfig(fileName);

  // Scale factor based on canonical 32x32 viewBox
  const vw = 32;
  const vh = 40;
  const foldSize = 8;

  // Light version of color for document body
  const bodyColor = color + '18'; // 9% opacity hex

  return (
    <Svg width={size} height={size * (vh / vw)} viewBox={`0 0 ${vw} ${vh}`}>
      {/* Document body */}
      <Path
        d={`M4 2 L${vw - foldSize} 2 L${vw - 4} ${2 + foldSize} L${vw - 4} ${vh - 2} Q${vw - 4} ${vh} ${vw - 6} ${vh} L6 ${vh} Q4 ${vh} 4 ${vh - 2} Z`}
        fill={bodyColor}
        stroke={color}
        strokeWidth={1.2}
      />
      {/* Fold triangle */}
      <Path
        d={`M${vw - foldSize} 2 L${vw - foldSize} ${2 + foldSize} L${vw - 4} ${2 + foldSize}`}
        fill={color + '30'}
        stroke={color}
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
      {/* Extension label background */}
      {label ? (
        <>
          <Rect
            x={2}
            y={vh / 2 - 1}
            width={vw - 4}
            height={14}
            rx={3}
            fill={color}
          />
          <SvgText
            x={vw / 2}
            y={vh / 2 + 9.5}
            textAnchor="middle"
            fontSize={label.length > 3 ? 7.5 : 9}
            fontWeight="700"
            fill="#FFFFFF"
          >
            {label}
          </SvgText>
        </>
      ) : null}
    </Svg>
  );
});

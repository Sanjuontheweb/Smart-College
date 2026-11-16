import React from 'react';
import { View, Text, StyleSheet, TextStyle, Platform } from 'react-native';

interface FormattedTextProps {
  content: string;
  style?: TextStyle | TextStyle[];
  color?: string;
}

/**
 * Parses and renders inline markdown formatting:
 * - Bold: **text**
 * - Italic: *text*
 * - Code: `code`
 * - Bullets: - or •
 */
export const FormattedMarkdownText: React.FC<FormattedTextProps> = ({
  content,
  style,
  color,
}) => {
  const lines = content.split('\n');

  return (
    <View style={styles.container}>
      {lines.map((line, lineIndex) => {
        const trimmed = line.trim();
        const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('• ');
        const lineContent = isBullet ? trimmed.substring(2) : line;

        return (
          <View key={lineIndex} style={[styles.lineRow, isBullet && styles.bulletRow]}>
            {isBullet ? (
              <Text style={[styles.textBase, { color: color || '#FFFFFF' }, style]}>
                <Text style={[styles.bulletPoint, { color: color || '#A78BFA' }]}>• </Text>
                {parseInlineMarkdown(lineContent, color)}
              </Text>
            ) : (
              <Text style={[styles.textBase, { color: color || '#FFFFFF' }, style]}>
                {parseInlineMarkdown(lineContent, color)}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
};

function parseInlineMarkdown(text: string, defaultColor?: string) {
  // Regex to match **bold**, *italic*, `code`
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <Text key={index} style={styles.boldText}>
          {part.slice(2, -2)}
        </Text>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <Text key={index} style={styles.italicText}>
          {part.slice(1, -1)}
        </Text>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <Text key={index} style={styles.codeText}>
          {part.slice(1, -1)}
        </Text>
      );
    }
    return part;
  });
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  lineRow: {
    width: '100%',
    marginBottom: 4,
  },
  bulletRow: {
    paddingLeft: 4,
  },
  bulletPoint: {
    fontWeight: '800',
    fontSize: 14,
  },
  textBase: {
    fontSize: 13,
    lineHeight: 20,
    width: '100%',
  },
  boldText: {
    fontWeight: '800',
  },
  italicText: {
    fontStyle: 'italic',
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    backgroundColor: 'rgba(122, 60, 255, 0.15)',
    fontWeight: '600',
    paddingHorizontal: 4,
    borderRadius: 4,
  },
});

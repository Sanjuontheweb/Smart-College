import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface RetroLogoProps {
  size?: 'small' | 'medium' | 'large';
  showSubtitle?: boolean;
}

export const RetroLogo: React.FC<RetroLogoProps> = ({
  size = 'small',
  showSubtitle = false,
}) => {
  const getDims = () => {
    switch (size) {
      case 'large':
        return { boxSize: 84, fontSize: 26, subSize: 13, border: 3 };
      case 'medium':
        return { boxSize: 52, fontSize: 18, subSize: 11, border: 2 };
      case 'small':
      default:
        return { boxSize: 38, fontSize: 13, subSize: 10, border: 2 };
    }
  };

  const { boxSize, fontSize, subSize, border } = getDims();

  return (
    <View style={styles.container}>
      {/* Retro Arcade Icon Badge */}
      <View
        style={[
          styles.outerBox,
          {
            width: boxSize,
            height: boxSize,
            borderWidth: border,
          },
        ]}
      >
        <View style={[styles.innerBox, { borderWidth: Math.max(1, border - 1) }]}>
          {/* Top spark dots */}
          <View style={styles.dotRow}>
            <View style={[styles.pixelDot, { backgroundColor: '#FFE14D' }]} />
            <View style={[styles.pixelDot, { backgroundColor: '#2EF2FF' }]} />
            <View style={[styles.pixelDot, { backgroundColor: '#FF2E88' }]} />
          </View>

          {/* Retro Pixel SC Text */}
          <View style={styles.letterWrapper}>
            <Text style={[styles.shadowText, { fontSize }]}>SC</Text>
            <Text style={[styles.pixelText, { fontSize }]}>SC</Text>
          </View>

          {/* Bottom health-bar dots */}
          <View style={styles.hpRow}>
            <View style={[styles.hpBar, { backgroundColor: '#FFE14D' }]} />
            <View style={[styles.hpBar, { backgroundColor: '#FFE14D' }]} />
            <View style={[styles.hpBar, { backgroundColor: '#FF2E88' }]} />
          </View>
        </View>
      </View>

      {showSubtitle && (
        <View style={styles.textColumn}>
          <Text style={[styles.titleText, { fontSize: subSize + 4 }]}>Survive College</Text>
          <Text style={[styles.tagline, { fontSize: subSize }]}>Sem 4 Academic Survival</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  outerBox: {
    backgroundColor: '#1A0F3C',
    borderColor: '#7A3CFF',
    borderRadius: 10,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7A3CFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 4,
  },
  innerBox: {
    flex: 1,
    width: '100%',
    borderColor: '#FF2E88',
    borderRadius: 7,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 2,
  },
  dotRow: {
    flexDirection: 'row',
    gap: 3,
  },
  pixelDot: {
    width: 3,
    height: 3,
    borderRadius: 1,
  },
  letterWrapper: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shadowText: {
    position: 'absolute',
    top: 1.5,
    left: 1.5,
    color: '#FF2E88',
    fontWeight: '900',
    letterSpacing: 1,
  },
  pixelText: {
    color: '#2EF2FF',
    fontWeight: '900',
    letterSpacing: 1,
  },
  hpRow: {
    flexDirection: 'row',
    gap: 2,
  },
  hpBar: {
    width: 4,
    height: 2,
    borderRadius: 1,
  },
  textColumn: {
    justifyContent: 'center',
  },
  titleText: {
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  tagline: {
    color: '#94A3B8',
    fontWeight: '600',
  },
});

export default RetroLogo;

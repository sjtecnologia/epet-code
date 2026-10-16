import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  Animated,
  StyleSheet,
  Dimensions,
  StatusBar,
} from 'react-native';
import Svg, { Ellipse } from 'react-native-svg';
import { colors } from '../../constants/colors';

const { width, height } = Dimensions.get('window');

// Pata desenhada com SVG (almofada principal + 4 dedos)
function PawPrint({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Ellipse cx="50" cy="72" rx="28" ry="22" fill={color} />
      <Ellipse cx="20" cy="40" rx="12" ry="10" fill={color} />
      <Ellipse cx="39" cy="28" rx="12" ry="10" fill={color} />
      <Ellipse cx="61" cy="28" rx="12" ry="10" fill={color} />
      <Ellipse cx="80" cy="40" rx="12" ry="10" fill={color} />
    </Svg>
  );
}

interface Particle {
  x: number;
  size: number;
  anim: Animated.Value;
  duration: number;
  delay: number;
}

const PARTICLE_COUNT = 28;

function createParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    x: Math.random() * (width - 60),
    size: 30 + Math.random() * 24,
    anim: new Animated.Value(0),
    duration: 1800 + Math.random() * 1000,
    delay: (i / PARTICLE_COUNT) * 1400,
  }));
}

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const particles = useMemo(() => createParticles(), []);
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    particles.forEach((p) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(p.delay),
          Animated.timing(p.anim, {
            toValue: 1,
            duration: p.duration,
            useNativeDriver: true,
          }),
          Animated.timing(p.anim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      ).start();
    });

    Animated.parallel([
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => onFinish());
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />

      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={[
            styles.particle,
            {
              left: p.x,
              opacity: p.anim.interpolate({
                inputRange: [0, 0.1, 0.8, 1],
                outputRange: [0, 1, 0.5, 0],
              }),
              transform: [
                {
                  translateY: p.anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [height + 60, -(p.size + 20)],
                  }),
                },
              ],
            },
          ]}
        >
          <PawPrint size={p.size} color="rgba(181, 230, 29, 0.45)" />
        </Animated.View>
      ))}

      <Animated.Image
        source={require('../../../logoepet/logo.png')}
        style={[
          styles.logo,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle: {
    position: 'absolute',
  },
  logo: {
    width: width * 0.68,
    height: width * 0.68,
  },
});

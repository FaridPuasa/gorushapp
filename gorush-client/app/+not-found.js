import React from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { PageScroll, useFormStyles, PageHeading } from '../lib/formPrimitives';
import { AnimatedPressable } from '../lib/animations';

// Expo Router's convention for an unmatched route - without this, navigating to a
// mistyped or stale URL fell through to whatever the last-matched route happened to
// render, with no indication anything was wrong.
export default function NotFound() {
  const formStyles = useFormStyles();
  const router = useRouter();

  return (
    <PageScroll title="Page Not Found" noindex>
      <View style={{ alignItems: 'center', paddingVertical: 40 }}>
        <PageHeading style={{ textAlign: 'center' }}>Page Not Found</PageHeading>
        <Text style={[formStyles.subtitle, { textAlign: 'center', marginBottom: 24 }]}>
          The page you're looking for doesn't exist or may have moved.
        </Text>
        <AnimatedPressable style={[formStyles.button, { paddingHorizontal: 32 }]} onPress={() => router.replace('/')}>
          <Text style={formStyles.buttonText}>Back to Home</Text>
        </AnimatedPressable>
      </View>
    </PageScroll>
  );
}

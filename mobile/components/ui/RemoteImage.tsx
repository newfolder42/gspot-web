import { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import type { ImageResizeMode, ImageStyle, StyleProp } from 'react-native';
import { SvgXml } from 'react-native-svg';

/** Avatars and catalog icons are sometimes SVG (…/character.svg). */
const SVG_URL = /\.svg(?:$|[?#])/i;

/** Session cache — the same avatars/icons repeat all over the feed. */
const svgCache = new Map<string, string>();
const notSvg = new Set<string>();
const inFlight = new Map<string, Promise<string>>();

export function loadSvg(url: string): Promise<string> {
  const cached = svgCache.get(url);
  if (cached) return Promise.resolve(cached);

  let pending = inFlight.get(url);
  if (!pending) {
    pending = fetch(url).then((res) => {
      if (!res.ok) throw new Error(`svg ${res.status}`);
      return res.text();
    });
    pending.then(
      (xml) => {
        if (xml.includes('<svg')) svgCache.set(url, xml);
        else notSvg.add(url);
        inFlight.delete(url);
      },
      () => inFlight.delete(url)
    );
    inFlight.set(url, pending);
  }
  return pending.then((xml) => {
    if (!xml.includes('<svg')) throw new Error('not an svg');
    return xml;
  });
}

function preserveAspectRatio(resizeMode: ImageResizeMode): string {
  if (resizeMode === 'contain') return 'xMidYMid meet';
  if (resizeMode === 'stretch') return 'none';
  return 'xMidYMid slice';
}

type Props = {
  uri: string;
  style?: StyleProp<ImageStyle>;
  resizeMode?: ImageResizeMode;
};

/**
 * React Native's <Image> has no SVG decoder on either platform, so SVG sources
 * paint nothing. This renders those through react-native-svg instead: known
 * .svg URLs go straight to the fetch, and anything <Image> fails to decode is
 * retried as SVG markup before giving up.
 */
export function RemoteImage({ uri, style, resizeMode = 'cover' }: Props) {
  const knownSvg = SVG_URL.test(uri) && !notSvg.has(uri);
  const [asSvg, setAsSvg] = useState(knownSvg);
  const [xml, setXml] = useState<string | null>(() => svgCache.get(uri) ?? null);

  useEffect(() => {
    setAsSvg(SVG_URL.test(uri) && !notSvg.has(uri));
    setXml(svgCache.get(uri) ?? null);
  }, [uri]);

  useEffect(() => {
    if (!asSvg || xml) return;
    let active = true;
    loadSvg(uri).then(
      (value) => {
        if (active) setXml(value);
      },
      () => {
        // Not SVG after all (or unreachable) — leave the <Image> to it, and
        // remember the failure so the <Image> onError can't loop us back here.
        notSvg.add(uri);
        if (active) setAsSvg(false);
      }
    );
    return () => {
      active = false;
    };
  }, [asSvg, uri, xml]);

  if (asSvg) {
    const flat = StyleSheet.flatten(style) ?? {};
    // Hold the slot while the markup is in flight so the layout doesn't jump.
    return (
      <View style={[style, { overflow: 'hidden' }]}>
        {xml ? (
          <SvgXml
            xml={xml}
            width="100%"
            height="100%"
            preserveAspectRatio={preserveAspectRatio(resizeMode)}
            // The border radius lives on the wrapper; the markup fills it.
            style={{ borderRadius: flat.borderRadius }}
          />
        ) : null}
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={style}
      resizeMode={resizeMode}
      onError={() => {
        // Could still be SVG served without the extension.
        if (!notSvg.has(uri)) setAsSvg(true);
      }}
    />
  );
}

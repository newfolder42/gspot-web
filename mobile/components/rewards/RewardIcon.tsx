import { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

/** The reward catalog stores its icons as SVG (…/reactions/love.svg). */
const SVG_URL = /\.svg(?:$|[?#])/i;

/** Session cache — the catalog is a handful of icons repeated all over the feed. */
const svgCache = new Map<string, string>();
const inFlight = new Map<string, Promise<string>>();

function loadSvg(url: string): Promise<string> {
  const cached = svgCache.get(url);
  if (cached) return Promise.resolve(cached);

  let pending = inFlight.get(url);
  if (!pending) {
    pending = fetch(url).then((res) => {
      if (!res.ok) throw new Error(`reward icon ${res.status}`);
      return res.text();
    });
    pending.then(
      (xml) => {
        svgCache.set(url, xml);
        inFlight.delete(url);
      },
      () => inFlight.delete(url)
    );
    inFlight.set(url, pending);
  }
  return pending;
}

/**
 * React Native's <Image> has no SVG decoder on either platform, so the catalog
 * icons never painted. Their markup is fetched once and handed to react-native-svg.
 */
function RemoteSvg({ url, size }: { url: string; size: number }) {
  const [xml, setXml] = useState<string | null>(() => svgCache.get(url) ?? null);

  useEffect(() => {
    let active = true;
    loadSvg(url)
      .then((value) => {
        if (active) setXml(value);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [url]);

  // Hold the slot while the markup is in flight so the row doesn't jump.
  if (!xml) return <View style={{ width: size, height: size }} />;
  return <SvgXml xml={xml} width={size} height={size} />;
}

/** Mirrors web RewardIcon: renders nothing when the definition has no icon. */
export function RewardIcon({ iconUrl, size = 16 }: { iconUrl: string | null; size?: number }) {
  if (!iconUrl) return null;
  if (SVG_URL.test(iconUrl)) return <RemoteSvg url={iconUrl} size={size} />;
  return <Image source={{ uri: iconUrl }} style={{ width: size, height: size }} resizeMode="contain" />;
}

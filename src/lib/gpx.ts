import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { parseGpx } from './gpxParse';
import { simplifyTrack, type TrackPoint } from './geo';

/**
 * GPX import.
 *
 * Garmin, Strava, Apple Health and most watches export `.gpx` — a plain XML
 * file of `<trkpt lat lon><time>` elements. Parsing it here means a run that was
 * recorded elsewhere still gets Proof's card and still counts in the week.
 *
 * FIT is a binary format and is deliberately not supported yet; the apps that
 * write FIT also write GPX.
 */

export type { ParsedGpx } from './gpxParse';
import type { ParsedGpx } from './gpxParse';

export type GpxImport = ParsedGpx & { simplified: TrackPoint[] };

/** Ask for a file, read it, parse it. Returns null when the user cancels. */
export async function pickGpx(): Promise<GpxImport | null> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: ['application/gpx+xml', 'application/xml', 'text/xml', '*/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (picked.canceled || !picked.assets?.length) return null;
  const asset = picked.assets[0];
  const xml = await FileSystem.readAsStringAsync(asset.uri);
  if (!/<gpx/i.test(xml)) throw new Error('That file is not a GPX track.');

  const parsed = parseGpx(xml);
  if (parsed.points.length < 2) throw new Error('The GPX file has no track points.');

  return {
    ...parsed,
    name: parsed.name === 'Imported run' ? (asset.name?.replace(/\.gpx$/i, '') ?? parsed.name) : parsed.name,
    simplified: simplifyTrack(parsed.points, 3),
  };
}

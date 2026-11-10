import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseGpx } from '../src/lib/gpxParse';

const track = `<gpx version="1.1" creator="Garmin"><trk><name>Morning Run</name><trkseg>
<trkpt lat="60.1920" lon="24.9450"><time>2026-11-09T06:00:00Z</time></trkpt>
<trkpt lat="60.1980" lon="24.9450"><time>2026-11-09T06:00:30Z</time></trkpt>
<trkpt lat="60.2040" lon="24.9450"><time>2026-11-09T06:01:00Z</time></trkpt>
<trkpt lat="60.2100" lon="24.9450"><time>2026-11-09T06:01:30Z</time></trkpt>
<trkpt lat="60.2160" lon="24.9450"><time>2026-11-09T06:02:00Z</time></trkpt>
</trkseg></trk></gpx>`;

test('parses every track point and the track name', () => {
  const run = parseGpx(track);
  assert.equal(run.points.length, 5);
  assert.equal(run.name, 'Morning Run');
});

test('distance is the sum of the legs, roughly 2.67 km', () => {
  const run = parseGpx(track);
  assert.ok(Math.abs(run.distanceM / 1000 - 2.669) < 0.01);
});

test('start and end come from the timestamps', () => {
  const run = parseGpx(track);
  assert.equal(new Date(run.startedAt).toISOString(), '2026-11-09T06:00:00.000Z');
  assert.equal(new Date(run.endedAt).toISOString(), '2026-11-09T06:02:00.000Z');
  assert.equal(Math.round((run.endedAt - run.startedAt) / 1000), 120);
});

test('a point without a time inherits the previous one, not "now"', () => {
  const truncated = `<gpx><trk><name>Cut</name><trkseg>
<trkpt lat="60.1920" lon="24.9450"><time>2026-11-09T06:00:00Z</time></trkpt>
<trkpt lat="60.1980" lon="24.9450"><time>2026-11-09T06:00:30Z</time></trkpt>
<trkpt lat="60.2040" lon="24.9450"/>
</trkseg></trk></gpx>`;
  const run = parseGpx(truncated);
  assert.equal(Math.round((run.endedAt - run.startedAt) / 1000), 31);
});

test('self-closing track points are not dropped', () => {
  const selfClosing = `<gpx><trk><trkseg>
<trkpt lat="60.1" lon="24.9"/>
<trkpt lat="60.2" lon="24.9"/>
</trkseg></trk></gpx>`;
  assert.equal(parseGpx(selfClosing).points.length, 2);
});

test('a file with no track points yields nothing, not a crash', () => {
  const run = parseGpx('<gpx><trk><name>Nothing</name></trk></gpx>');
  assert.equal(run.points.length, 0);
  assert.equal(run.distanceM, 0);
});

test('points are sorted by time even if the file is out of order', () => {
  const messy = `<gpx><trk><trkseg>
<trkpt lat="60.2" lon="24.9"><time>2026-11-09T06:01:00Z</time></trkpt>
<trkpt lat="60.1" lon="24.9"><time>2026-11-09T06:00:00Z</time></trkpt>
</trkseg></trk></gpx>`;
  const run = parseGpx(messy);
  assert.ok(run.points[0].t <= run.points[1].t);
});

export const FIXTURE_JSON = JSON.stringify([
  ['Layer', {
    applyMatrix: true,
    children: [
      ['Path', {
        segments: [[100, 100], [200, 100], [200, 200], [100, 200]],
        closed: true,
        strokeColor: [1, 0, 0, 1],
        fillColor: [0, 0, 1, 0.3],
      }],
      ['Path', {
        segments: [[150, 150], [250, 150], [250, 250]],
        closed: true,
        strokeColor: [0, 1, 0, 1],
        fillColor: [1, 0, 0, 0.3],
      }],
    ],
  }],
])

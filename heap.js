import { Heap } from '@datastructures-js/heap';

export const minimumTime = function (grid) {
  let n = grid.length, m = grid[0].length;
  let heap = new Heap((l, r) => l[0] - r[0]);
  let visited = Array(n).fill(0).map(x => Array(m).fill(false));
  heap.push([0, 0, 0]);
  visited[0][0] = true;
  if (grid[1][0] > 1 && grid[0][1] > 1) return -1;
  while (heap.size()) {
    let [t, i, j] = heap.pop();
    for (let [ni, nj, nt] of next(i, j, t)) {
      visited[ni][nj] = true;
      heap.push([nt, ni, nj]);
      if (ni === n - 1 && nj === m - 1) return nt;
    }
  }
  return -1;

  function* next(i, j, t) {
    for (let [di, dj] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      let ni = i + di;
      let nj = j + dj;
      if (ni >= 0 && ni < n && nj >= 0 && nj < m && !visited[ni][nj]) {
        let nt = Math.max(t + 1, grid[ni][nj]);
        if ((t + 1) % 2 !== nt % 2) nt++;
        yield [ni, nj, nt];
      }
    }
  }
};

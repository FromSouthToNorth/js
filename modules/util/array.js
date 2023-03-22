/**
 * Returns an Array with all the duplicates removed
 * let a = [1,1,2,3,3];
 * utilArrayUniq(a)
 *   [1,2,3]
 */
export function utilArrayUniq(a) {
  return Array.from(new Set(a));
}

// Groups the items of the Array according to the given key
// `key` can be passed as a property or as a key function
//
// let pets = [
//     { type: 'Dog', name: 'Spot' },
//     { type: 'Cat', name: 'Tiger' },
//     { type: 'Dog', name: 'Rover' },
//     { type: 'Cat', name: 'Leo' }
// ];
//
// utilArrayGroupBy(pets, 'type')
//   {
//     'Dog': [{type: 'Dog', name: 'Spot'}, {type: 'Dog', name: 'Rover'}],
//     'Cat': [{type: 'Cat', name: 'Tiger'}, {type: 'Cat', name: 'Leo'}]
//   }
//
// utilArrayGroupBy(pets, function(item) { return item.name.length; })
//   {
//     3: [{type: 'Cat', name: 'Leo'}],
//     4: [{type: 'Dog', name: 'Spot'}],
//     5: [{type: 'Cat', name: 'Tiger'}, {type: 'Dog', name: 'Rover'}]
//   }
export function utilArrayGroupBy(a, key) {
  return a.reduce(function(acc, item) {
    let group = (typeof key === 'function') ? key(item) : item[key];
    (acc[group] = acc[group] || []).push(item);
    return acc;
  }, {});
}

// Splits array into chunks of given chunk size
// let a = [1,2,3,4,5,6,7];
// utilArrayChunk(a, 3);
//   [[1,2,3],[4,5,6],[7]];
export function utilArrayChunk(a, chunkSize) {
  if (!chunkSize || chunkSize < 0) return [a.slice()];

  let result = new Array(Math.ceil(a.length / chunkSize));
  return Array.from(result, function(item, i) {
    return a.slice(i * chunkSize, i * chunkSize + chunkSize);
  });
}

// Union (a ∪ b): create a set that contains the elements of both set a and set b.
// let a = [1,2,3];
// let b = [4,3,2];
// utilArrayUnion(a, b)
//   [1,2,3,4]
export function utilArrayUnion(a, b) {
  const result = new Set(a);
  b.forEach(function(v) { result.add(v); });
  return Array.from(result);
}

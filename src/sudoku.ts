console.log('hi')

const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9]
nums.map(i => console.log(i))

const combos = nums.flatMap(i => nums.flatMap(j => i !== j ? addTo([i, j]) : null))
                   .filter(x => !!x)
                   .filter(x => x![0] > x![x!.length - 1])

combos.sort((a,b) => a!.length - b!.length)
console.log({ r: JSON.stringify(combos) })

function addTo (a: Array<number>): Array<Array<number>> {
  const prevEntry = a[a.length - 2]
  const lastEntry = a[a.length - 1]

  const sum = prevEntry + lastEntry
  const sumArray = (sum <= 9 && !a.includes(sum)) ?
    [...a, sum] : null

  const diff = Math.abs(prevEntry - lastEntry)
  const diffArray = (!a.includes(diff))
    ? [...a, diff] : null


  if (sumArray && diffArray)
    return [...addTo(sumArray), ...addTo(diffArray)]
  else if (sumArray)
    return addTo(sumArray)
  else if (diffArray)
    return addTo(diffArray)
  else
    return [a]
}


const result = [[8, 4], [3, 1, 2], [3, 2, 1], [4, 7, 3], [5, 8, 3], [5, 9, 4], [6, 2, 4], [6, 4, 2], [6, 8, 2], [6, 9, 3], [7, 9, 2], [8, 9, 1], [9, 3, 6], [9, 6, 3], [4, 3, 1, 2], [5, 3, 2, 1], [7, 1, 6, 5], [8, 1, 7, 6], [8, 2, 6, 4], [8, 6, 2, 4], [9, 1, 8, 7], [9, 2, 7, 5], [5, 2, 3, 1, 4], [5, 4, 1, 3, 2], [7, 4, 3, 1, 2], [8, 5, 3, 2, 1], [8, 7, 1, 6, 5], [9, 8, 1, 7, 6], [7, 3, 4, 1, 5, 6], [7, 5, 2, 3, 1, 4], [9, 4, 5, 1, 6, 7], [9, 5, 4, 1, 3, 2], [9, 7, 2, 5, 3, 8]]

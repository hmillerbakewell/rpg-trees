Math.seedrandom('rpg tree generator');

let factorise = function (n) {
    if (n !== Math.floor(n)) {
        return factorise(n)
    }
    if (n < 2) { return [] } else {
        // find any factor
        let found = false
        let i = 2
        while (!found) {
            if ((n % i) == 0) {
                found = true
            } else {
                i++
            }
        }
        return [[i], factorise(n / i)].flat()
    }
}

let d = function (n) {
    return Math.ceil(Math.random() * n)
}

let rfrom = function (array) {
    let n = array.length
    let r = d(n) - 1
    return array[r]
}

let generateTree = function (howTall, howManyBreakpoints, maxWidth) {
    let extendChain = function (a) {
        let rightWidth = function (b) {
            return (b > 1 && b < maxWidth + 1)
        }
        let nextTry = function () {
            let rolled = Math.min(d(6), d(6)) - 1
            if (rolled < 1) {
                let factor = rfrom(factorise(a))
                return a / factor
            } else {
                return rolled * a
            }
        }
        let current = nextTry()
        while (!rightWidth(current)) {
            console.log(a + ", " + current + ", "+ rightWidth(current))
            current = nextTry()
        }
        return current
    }
    let initialChain = [1]
    while (initialChain.length < howManyBreakpoints) {
        initialChain.unshift(extendChain(initialChain[0]))
    }
    initialChain = initialChain.reverse()
    let paddingNeeded = howTall / howManyBreakpoints
    let repeat = function (v, n) {
        if (n < 1) { return [] }
        return [[v], repeat(v, n - 1)].flat()
    }
    let paddedChain = initialChain.map(v => repeat(v, paddingNeeded)).flat()
    let tail = repeat(paddedChain[paddedChain.length - 1], howTall - paddedChain.length)
    return [paddedChain, tail].flat()
}
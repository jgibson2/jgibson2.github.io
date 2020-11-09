function cholesky(matrix) {
	// https://observablehq.com/@sw1227/cholesky-decomposition
	// Argument "matrix" can be either math.matrix or standard 2D array
	const A = math.matrix(matrix);
	// Matrix A must be symmetric
	console.assert(math.deepEqual(A, math.transpose(A)));

	const n = A.size()[0];
	// Prepare 2D array with 0
	const L = new Array(n).fill(0).map(_ => new Array(n).fill(0));

	d3.range(n).forEach(i => {
	d3.range(i+1).forEach(k => {
		const s = d3.sum(d3.range(k).map(j => L[i][j]*L[k][j]));
		L[i][k] = i === k ? math.sqrt(A.get([k, k]) - s) : 1/L[k][k] * (A.get([i, k]) - s);})});
	return L;
}

function maximizeBoundedFunction(fn, bounds, penalty=1000) {
	let loss = xs => {
		let penaltyMinBound = math.sum(xs.map((x, i) => x < bounds[0][i] ? penalty : 0));
		let penaltyMaxBound = math.sum(xs.map((x, i) => x > bounds[1][i] ? penalty : 0));
		let val = fn(xs) - (penaltyMinBound + penaltyMaxBound);
		return -1 * val;
	}
	let soln = fmin.nelderMead(loss, math.add(bounds[0], math.divide(math.subtract(bounds[1], bounds[0]), 2)));
	return soln.x;
}

function squeezeLast(A) {
	let size = A.size();
	if(size[size.length - 1] != 1) {
		return A;
	}
	return math.reshape(A, size.slice(0, size.length - 1));
}

// Complementary error function
// From Numerical Recipes in C 2e p221
function erfc(x) {
	var z = Math.abs(x);
	var t = 1 / (1 + z / 2);
	var r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 +
	    t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 +
	    t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 +
	    t * (-0.82215223 + t * 0.17087277)))))))))
	return x >= 0 ? r : 2 - r;
}

function gaussianPDF(x, mean=0.0, variance=1.0) {
    var m = math.sqrt(variance) * Math.sqrt(2 * Math.PI);
    var e = Math.exp(-Math.pow(x - mean, 2) / (2 * variance));
    return e / m;
}

function gaussianCDF(x, mean=0.0, variance=1.0) {
	return 0.5 * erfc(-(x - mean) / (math.sqrt(variance) * Math.sqrt(2)));
}

function sampleGaussian(mean,std){
	const _2PI = Math.PI * 2;
	var u1 = Math.random();
	var u2 = Math.random();
	var z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(_2PI * u2);
	// var z1 = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(_2PI * u2);
	return z0 * std + mean;
}


function SE(x, x2, l = 1.0, s = 1.0) {
	return (s**2) * math.exp(-1 * math.norm(x - x2) / (2*(l**2)));
}

function RQ(x, x2, alpha=1.0, l = 1.0, s = 1.0) {
        return (s**2) * (1 + (math.norm(x-x2)**2)/(2*alpha*(l**2)))**(-alpha)
}

function Matern12(x, x2, l = 1.0, s = 1.0) {
        return s**2 * math.exp(-math.norm(x-x2) / l)
}

function Matern32(x, x2, l = 1.0, s = 1.0) {
        return (s**2) * (1 + (math.sqrt(3) * math.norm(x-x2) / l)) * math.exp(-1 * math.sqrt(3) * math.norm(x-x2) / l)
}

function Matern52(x, x2, l = 1.0, s = 1.0) {
        return (s**2) * (1 + (math.sqrt(5) * math.norm(x-x2) / l) + (5 * (math.norm(x-x2)**2) / (3 * (l**2)))) * math.exp(-1 * math.sqrt(5) * math.norm(x-x2) / l)
}

function Cov(gp, X, X2) {
	let K = [];
	X.forEach((x1, i) => {
		K.push([]);
		X2.forEach( (x2, j) => {
			K[i].push(gp.kernel(x1, x2));
		});
	});
	return math.matrix(K);
}

function predict(gp, X) {
	let tX = gp.xData;
	let tY = gp.yData;
	if(tX && tY) {
		let K = Cov(gp, tX, tX);
		K = math.add(K, math.multiply(gp.sigma, math.identity(math.size(K))));
		const L = math.matrix(cholesky(K));
		const v = squeezeLast(math.apply(Cov(gp, X, tX), 1, x => math.lsolve(L, x)));
		const alpha = squeezeLast(math.usolve(math.transpose(L), math.lsolve(L, math.subtract(tY, tX.map(x => gp.mean(x))))));
		
		const mean = math.add(X.map(x => gp.mean(x)), math.multiply(Cov(gp, X, tX), alpha)).toArray();
		const std = math.diag(math.subtract(Cov(gp, X, X), math.multiply(v, math.transpose(v)))).toArray();

		return {mean: mean, std: std}
	} else {
		const mean = X.map(x => gp.mean(x)).toArray();
		const std = math.diag(Cov(gp, X, X)).toArray();

		return {mean: mean, std: std}
	}
}

function ExpectedImprovement(gp, X, eta=0.01) {
	if(gp.yData != null) {
		let bestY = math.max(gp.yData);
		let i = [...Array(gp.yData.size()[0]).keys()].filter(y => bestY == math.subset(gp.yData, math.index(y)))[0];
		let bestPhi = predict(gp, [math.subset(gp.xData, math.index(i))]).mean[0];

		let predX = predict(gp, X);
		let r = math.subtract(predX.mean, bestPhi + eta);
		let Z = math.dotDivide(r, math.add(predX.std, 1e-8))
		let EI = math.add(math.dotMultiply(r, Z.map(x => gaussianCDF(x))), math.dotMultiply(predX.std, Z.map(x => gaussianPDF(x))));
		return EI;
	} else {
		let predX = predict(gp, X);
		let r = math.subtract(predX.mean, eta);
		let Z = math.dotDivide(r, math.add(predX.std, 1e-8))
		let EI = math.add(math.dotMultiply(r, Z.map(x => gaussianCDF(x))), math.dotMultiply(predX.std, Z.map(x => gaussianPDF(x))));
		return EI;
	}

}

function KnowledgeGradient(gp, X, eta=0.01) {
	if(gp.yData != null) {
		let bestY = math.max(gp.yData);
		let i = [...Array(gp.yData.size()[0]).keys()].filter(y => bestY == math.subset(gp.yData, math.index(y)))[0];
		let bestPhi = predict(gp, [math.subset(gp.xData, math.index(i))]).mean[0];

		let predX = predict(gp, X);
		let r = math.subtract(predX.mean, bestPhi + eta);
		let Z = math.dotDivide(r, math.add(predX.std, 1e-8))
		let EI = math.add(math.dotMultiply(r, Z.map(x => gaussianCDF(x))), math.dotMultiply(predX.std, Z.map(x => gaussianPDF(x))));
		EI = math.subtract(EI, math.max(math.subtract(predX.mean, bestPhi), 0));
		return EI;	
	} else {
		let predX = predict(gp, X);
		let r = math.subtract(predX.mean, eta);
		let Z = math.dotDivide(r, math.add(predX.std, 1e-8))
		let EI = math.add(math.dotMultiply(r, Z.map(x => gaussianCDF(x))), math.dotMultiply(predX.std, Z.map(x => gaussianPDF(x))));
		EI = math.subtract(EI, math.max(predX.mean, 0));
		return EI;
	}
}

function UpperConfidenceBound(gp, X, beta=2.0) {
	let predX = predict(gp, X);
	let UCB = math.add(predX.mean, math.dotMultiply(beta, predX.std));
	return UCB;	
}

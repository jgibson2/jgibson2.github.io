function plotGP(gp, X, acquisitionFunction=null, elem='chart', color='#AB63FA') {
	let pred = predict(gp, X);
	let Xdata = [];
	math.map(X, e => Xdata.push(e));
	let trace1 = {
		x: Xdata,
		y : pred.mean,
		mode: 'lines',
		name: 'Mean',
		line : { color: color }
	};

	let trace2 = {
		x: Xdata.concat(Xdata.slice().reverse()),
		y : pred.mean.map((e,i) => e - (1.96 * pred.std[i])).concat(pred.mean.map((e,i) => e + (1.96 * pred.std[i])).reverse()),
		fill: 'toself',
		name: '95% Credible Interval',
		line : { color: color }
	};
	let data = [trace1, trace2];
	if(gp.xData && gp.yData) {
		let tXdata = [];
		math.map(gp.xData, e => tXdata.push(e));
		let tYdata = [];
		math.map(gp.yData, e => tYdata.push(e));
		data.push({
			x: tXdata,
			y : tYdata,
			mode: 'markers',
			name: 'Observations',
			marker : { color: color }
		})
	}
	if(acquisitionFunction) {
		let EI = acquisitionFunction(gp, X);
		let xMax = Xdata[Xdata.length / 2 | 0], yMax = pred.mean[pred.mean.length / 2 | 0]; eiMax = Number.NEGATIVE_INFINITY;
		EI.map((e, i) => {
			if(e > eiMax) {
				eiMax = e; xMax = Xdata[i]; yMax = pred.mean[i];
			}
			return e;
		});
		data.push({
			x: [xMax],
			y: [0.0],
			mode: 'markers',
			marker: {
				color: 'black',
				size: 25,
				symbol: 'arrow-down'
			},
			name: 'Proposed next point'
		});
	}
	let layout = {
	  paper_bgcolor: "rgb(255,255,255)", 
	  plot_bgcolor: "rgb(229,229,229)", 
	  xaxis: {
	    gridcolor: "rgb(255,255,255)", 
	    showgrid: true, 
	    showline: false, 
	    showticklabels: true, 
	    tickcolor: "rgb(127,127,127)", 
	    ticks: "outside", 
	    zeroline: false
	  }, 
	  yaxis: {
	    gridcolor: "rgb(255,255,255)", 
	    showgrid: true, 
	    showline: false, 
	    showticklabels: true, 
	    tickcolor: "rgb(127,127,127)", 
	    ticks: "outside", 
	    zeroline: true
	  }
	};
	Plotly.react(elem, data, layout);

}

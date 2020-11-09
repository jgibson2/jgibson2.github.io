function plotGP(gp, X, acquisitionFunction=null, plotAcquisitionFn=false, elem='chart', color='#AB63FA', acFnColor='#32CD32') {
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
	let tXdata = [];
	let tYdata = [];
	if(gp.xData && gp.yData) {
		math.map(gp.xData, e => tXdata.push(e));
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
		i = pred.mean.indexOf(Math.max(...pred.mean));
		let xMax = Xdata[i], yMax = pred.mean[i]; eiMax = EI[i];
		EI.map((e, i) => {
			if(e > eiMax) {
				eiMax = e; xMax = Xdata[i]; yMax = pred.mean[i];
			}
			return e;
		});
		if(plotAcquisitionFn) {
			let acdata = [];
			math.map(EI, e => acdata.push(e));
			data.push({
				x: Xdata,
				y: acdata,
				yaxis: 'y2',
				mode: 'lines',
				name: 'Acquisition Function',
				fill: 'tozeroy',
				line : { color: acFnColor }
			});
		}
		data.push({
			x: [xMax],
			y: [0.0],
			mode: 'markers',
			marker: {
				color: 'black',
				size: 25,
				symbol: 'arrow-up'
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
	  yaxis2: {
	    domain: [0, 0.1],
	    showgrid: false,
	    zeroline: false,
	    showticklabels: true, 
	    tickcolor: "rgb(127,127,127)", 
	    ticks: "outside", 
	  },
	  yaxis: {
	    domain: [0.2, 1.0],
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

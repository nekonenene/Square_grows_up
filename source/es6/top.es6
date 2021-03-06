window.addEventListener("load", function ()
{
	"use strict";

	growRegularPolygon(5, undefined, 0.5);

}, false);

function growRegularPolygon(_vertices, _r, _reducingLevel)
{
	deleteAllPath();
	initZoomRangeInput(1.0);
	initStrokeWidthRangeInput(2.5);
	setStrokeWidthInputListener();

	var vertices = _vertices;
	var r = _r || 80; // 最初の半径。2で割られていくので、2の階乗の値がもっとも良い
	var centerPoint = [3 * r, 3 * r];
	setZoomInputListener(centerPoint);

	var reducingLevel = _reducingLevel || 0.5; // 子供の正多角形の親に対しての大きさ
	initVerticesRangeInput(vertices);
	initReducingLevelRangeInput(reducingLevel);

	var verticesAngle = PreviousPolygon.verticesAngle(vertices); // 頂点の角度
	var firstAngle = verticesAngle / 2; // X軸に平行な中心点を通る線を水平としたときの、points[0]の傾き

	var points = calculateRegularPolygonsPoints(vertices, firstAngle, r, centerPoint);
	var innerPoints = points; // 内側に育つ正多角形の頂点座標
	createPolygon(points);

	var initialPolygon = new PreviousPolygon(vertices, points, firstAngle, r, centerPoint);
	var previousPolygons = [ initialPolygon ];

	d3.select( "button#inner-grow-button" )
		.on("click", function(){
			innerPoints = calculateNextInnerPoints( innerPoints );
			createPolygon( innerPoints );
		});

	d3.select( "button#outer-grow-button" )
		.on("click", function(){
			var reducingLevel = Number(d3.selectAll( "input#reducing-level" )[0][0].value);
			r *= reducingLevel;
			if( vertices % 2 === 1){ firstAngle += 180; }

			previousPolygons = createOuterRegularPolygons(previousPolygons, vertices, firstAngle, r, reducingLevel);
		});

	d3.select( "button#init-button" )
		.on("click", function(){
			initialPolygon = createInitialPolygon(initialPolygon);
			vertices         = initialPolygon.vertices;
			firstAngle       = initialPolygon.firstAngle;
			r                = initialPolygon.r;
			centerPoint      = initialPolygon.centerPoint;
			previousPolygons = [ initialPolygon ];
			innerPoints = initialPolygon.points;
		});
}

/** init-button （さいしょから）を押したときの挙動 */
function createInitialPolygon(_initialPolygon)
{
	deleteAllPath();
	initZoomRangeInput(1.0);
	var vertices    = d3.selectAll( "input#vertices" )[0][0].value;
	var firstAngle  = PreviousPolygon.verticesAngle(vertices) / 2;
	var r           = _initialPolygon.r;
	var centerPoint = _initialPolygon.centerPoint;

	var points = calculateRegularPolygonsPoints(vertices, firstAngle, r, centerPoint);
	createPolygon(points);

	return ( new PreviousPolygon(vertices, points, firstAngle, r, centerPoint) );
}

/** 前回作られた図形の情報、このクラスの配列を作り保存するとよい */
class PreviousPolygon
{
	constructor(_vertices, _points, _firstAngle, _r, _centerPoint){
		this.vertices    = _vertices;
		this.points      = _points;
		this.firstAngle  = _firstAngle;
		this.r           = _r;
		this.centerPoint = _centerPoint;
	}

	/** 頂点の角度を求める */
	static verticesAngle(vertices){
		return (180 - 360 / vertices);
	}
}

/** 前回作られた正多角形の周りに半分の大きさの合同な図形を描く
	@param previousPolygons : 前回作られた図形の情報 PreviousPolygon クラスが、作った個数ぶん格納された配列
	@param reducingLevel : 子供の正多角形の、親から見ての倍率
	他の引数は calculateRegularPolygonsPoints メソッドを参照のこと */
function createOuterRegularPolygons(_previousPolygons, _vertices, _firstAngle, _r, _reducingLevel)
{
	var ppCopy = _previousPolygons.slice(0);
	var creatingPolygons = [];

	for(var i = 0; i < ppCopy.length; ++i)
	{
		for(var j = 0; j < _vertices; ++j)
		{
			var jNext = ( j !== (_vertices - 1) ? j + 1 : 0 );
			var centerX = ( (ppCopy[i].points[j][0] + ppCopy[i].points[jNext][0]) / 2 - ppCopy[i].centerPoint[0] ) * ( 1 + _reducingLevel ) + ppCopy[i].centerPoint[0] ;
			var centerY = ( (ppCopy[i].points[j][1] + ppCopy[i].points[jNext][1]) / 2 - ppCopy[i].centerPoint[1] ) * ( 1 + _reducingLevel ) + ppCopy[i].centerPoint[1] ;
			var centerPoint = [centerX, centerY];
			var points = calculateRegularPolygonsPoints(_vertices, _firstAngle, _r, centerPoint);
			createPolygon( points );
			creatingPolygons.push( new PreviousPolygon(_vertices, points, _firstAngle, _r, centerPoint) );
		}
	}
	return creatingPolygons;
}

/** 正多角形をPATHで描くために必要な座標群を計算する
 	@param vertices    : 頂点数、正X角形のX
	@param firstAngle  : x軸と水平を0としたときの、最初の座標の傾き
	@param r           : 正多角形を引く基準とする円の半径
	@param centerPoint : 基準とする円の中心座標
	*/
function calculateRegularPolygonsPoints(_vertices, _firstAngle, _r, _centerPoint)
{
	var dividedAngle  = 360 / _vertices;
	var verticesAngle = 180 - dividedAngle; // 頂点の角度
	var points = [];

	for(var i = 0; i < _vertices; ++i)
	{
		var angleRadian =  ( _firstAngle + i * dividedAngle ) / 180 * Math.PI;
		var x = _r * Math.cos( angleRadian );
		var y = _r * Math.sin( angleRadian );

		x += _centerPoint[0];  y += _centerPoint[1];
		points.push([x, y]);
	}
	return points;
}

/** PATH を全て除去 */
function deleteAllPath() {
	var svgField = d3.select( "svg#sample" )
		.selectAll("path")
		.remove();
}

/** ズーム倍率を入力するスライダー */
function initZoomRangeInput(_defaultZoom)
{
	var rounded = 1;

	d3.selectAll( "input#zoom-level" )[0][0].value = _defaultZoom;
	d3.selectAll( "#zoom-level-output" )[0][0].textContent = _defaultZoom.toFixed(rounded) + " 倍" ;
}

/** 線幅を入力するスライダー */
function initStrokeWidthRangeInput(_defaultStrokeWidth)
{
	var rounded = 1;
	
	d3.selectAll( "input#stroke-width-level" )[0][0].value = _defaultStrokeWidth;
	d3.selectAll( "#stroke-width-level-output" )[0][0].textContent = _defaultStrokeWidth.toFixed(rounded) + " px" ;
}

/** 正 x 角形を入力するスライダーのところ */
function initVerticesRangeInput(_defaultVertices)
{
	d3.selectAll( "input#vertices" )[0][0].value = _defaultVertices;
	d3.selectAll( "#vertices-output" )[0][0].textContent = "正 " + _defaultVertices + " 角形" ;

	d3.select( "input#vertices" )
		.on("change", function(){
			d3.selectAll( "#vertices-output" )[0][0].textContent = "正 " + this.value + " 角形" ;
		});
}

function initReducingLevelRangeInput(_defaultReducingLevel)
{
	var rounded = 2; // 小数点以下の何桁までを表示するか

	d3.selectAll( "input#reducing-level" )[0][0].value = _defaultReducingLevel;
	d3.selectAll( "#reducing-level-output" )[0][0].textContent = _defaultReducingLevel.toFixed(rounded) + " 倍" ;

	d3.select( "input#reducing-level" )
		.on("change", function(){
			d3.selectAll( "#reducing-level-output" )[0][0].textContent = Number(this.value).toFixed(rounded) + " 倍" ;
		});
}

/** 「zoom」のスライダーに対してリスナー設定 */
function setZoomInputListener(_centerPoint)
{
	d3.select( "input#zoom-level" )
		.on("change", function(){
			d3.select( "svg#sample" )
				.selectAll("path")
				.attr({
					"transform" : "translate(0, 0) scale(" + this.value + ")"
				});
			d3.selectAll( "#zoom-level-output" )[0][0].textContent = Number(this.value).toFixed(1) + " 倍" ;
			d3.selectAll( "svg#sample" )
				.style("width" , _centerPoint[0] * 2 * this.value + "px")
				.style("height", _centerPoint[1] * 2 * this.value + "px");
		});
}

/** 「線幅」のスライダーに対してリスナー設定 */
function setStrokeWidthInputListener()
{
	d3.select( "input#stroke-width-level" )
		.on("change", function(){
			d3.select( "svg#sample" )
				.selectAll("path")
				.attr({
					"stroke-width" : this.value
				});
			d3.selectAll( "#stroke-width-level-output" )[0][0].textContent = Number(this.value).toFixed(1) + " px" ;
		});
}

/** x点の座標をもらってきて、そこから x角形を作成する
	@param points : [x, y] の座標が複数格納された二次元配列 */
function createPolygon(_points)
{
	var svgField = d3.select("svg#sample");

	var lineFunction
			= d3.svg.line()
					.x(function(d,i) { return _points[i][0]; })
					.y(function(d,i) { return _points[i][1]; })
					.interpolate("linear");

	/* path の SVG については難しいので、以下でオプションを参照のこと
	 * http://www.h2.dion.ne.jp/~defghi/svgMemo/svgMemo_03.htm */

	var zoomLevel = d3.selectAll( "input#zoom-level" )[0][0].value;
	var strokeWidthLevel = d3.selectAll( "input#stroke-width-level" )[0][0].value;
	var centerAdjust = 60 * zoomLevel;

	var path = svgField.append("path")
		.attr({
			"d"                : lineFunction(_points)+"z", // z オプションによって図形は閉じられる
			"stroke"           : "#3e3833",
			"stroke-width"     : strokeWidthLevel,
			"fill"             : "none",
			"shape-rendering"  : "auto", // アンチエイリアス設定
			"transform"        : "translate(" + centerAdjust + ", " + centerAdjust + ") scale(0.1)",
			"stroke-linejoin"  : "round", // 頂点を丸める
		});

	// だんだん大きくなるアニメーション
	path.transition()
		.duration(1400)
		.attr({
			"transform" :"translate(0, 0) scale(" + zoomLevel + ")",
		});
}

/** 内側に x角形を作るための次の点を計算する
	@param previousPoints : 新しく作る図形の一個前の図形の座標たち */
function calculateNextInnerPoints(_previousPoints)
{
	var vertices = _previousPoints.length;
	var nextPoints = [];

	for ( var i = 0; i < vertices; ++i )
	{
		var iNext = i + 1;
		if( i === vertices - 1 )
		{
			iNext = 0;
		}
		var xNext = ( _previousPoints[ i ][ 0 ] + _previousPoints[ iNext ][ 0 ] ) / 2;
		var yNext = ( _previousPoints[ i ][ 1 ] + _previousPoints[ iNext ][ 1 ] ) / 2;
		nextPoints.push( [ xNext, yNext ] );
	}

	return nextPoints;
}

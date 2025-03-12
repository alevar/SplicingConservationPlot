import * as d3 from "d3";
import { Dimensions, BedData } from 'sparrowgenomelib';

interface HeatMapData {
  dimensions: Dimensions;
  xScale: d3.ScaleLinear<number, number>;
  bedData: BedData;
  colorScale?: d3.ScaleSequential<string>; // Color scale for the heatmap
  yScale?: d3.ScaleLinear<number, number>; // Optional yScale parameter
  cellHeight?: number; // Optional parameter for cell height
}

export class HeatMap {
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private dimensions: Dimensions;
  private bedData: BedData;
  private xScale: d3.ScaleLinear<number, number>;
  private yScale: d3.ScaleLinear<number, number>;
  private useProvidedYScale: boolean = false;
  private colorScale: d3.ScaleSequential<string>;
  // escape tsc for unused
  // @ts-ignore
  private cellHeight: number;

  constructor(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    data: HeatMapData
  ) {
    this.svg = svg;
    this.dimensions = data.dimensions;
    this.bedData = data.bedData;
    this.xScale = data.xScale;
    this.yScale = data.yScale ?? d3.scaleLinear();
    this.useProvidedYScale = data.yScale !== undefined;
    // Default color scale if not provided (blue sequential scale)
    this.colorScale = data.colorScale ?? d3.scaleSequential(d3.interpolateMagma);
    // Set cell height, with a default of 20 if not provided
    this.cellHeight = data.cellHeight ?? 20;
  }

  public get_yScale(): d3.ScaleLinear<number, number> {
    return this.yScale;
  }

  public plot(): void {
    // Create the y-axis scale if not provided
    if (!this.useProvidedYScale) {
      this.yScale = d3.scaleLinear()
        .domain([0, this.bedData.maxScore()])
        .range([this.dimensions.height, 0]); // Invert the range
    }

    // Set color scale domain based on score range
    this.colorScale.domain([0, this.bedData.maxScore()]);

    // Add a background rectangle for the grid
    this.svg.append("rect")
      .attr("class", "grid-background")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", this.dimensions.width)
      .attr("height", this.dimensions.height)
      .attr("fill", "#f7f7f7")
      .attr("fill-opacity", 0.75);

    // Add horizontal grid lines
    this.svg.append("g")
      .attr("class", "grid")
      .attr("stroke", "rgba(0, 0, 0, 0.1)")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "5,5")
      .attr("opacity", 0.3)
      .call(d3.axisLeft(this.yScale)
        .ticks(2)
        .tickSize(-this.dimensions.width)
        .tickFormat(null));

    // Add heatmap cells
    this.svg.selectAll(".heatmap-cell")
      .data(this.bedData.getData())
      .enter()
      .append("rect")
      .attr("class", "heatmap-cell")
      .attr("x", d => this.xScale(d.start))
      .attr("y", 0) // Position at the top of the chart area
      .attr("width", d => Math.max(1, this.xScale(d.end) - this.xScale(d.start)))
      .attr("height", this.dimensions.height) // Use full height
      .attr("fill", d => this.colorScale(d.score)); // Add thin borders between cells
  }
}
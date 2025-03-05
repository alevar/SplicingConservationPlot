import * as d3 from "d3";
import { Dimensions, SJData } from 'sparrowgenomelib';

interface SequenceLogoData {
    dimensions: Dimensions;
    sjData: SJData;
    xScale: d3.ScaleLinear<number, number>;
    yScale?: d3.ScaleLinear<number, number>;
    colors?: { [key: string]: string };
    letterWidth?: number;
    columnSpacing?: number; // Added parameter for column spacing
}

export class SequenceLogo {
    private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    private dimensions: Dimensions;
    private sjData: SJData;
    private xScale: d3.ScaleLinear<number, number>;
    private yScale: d3.ScaleLinear<number, number>;
    private useProvidedYScale: boolean = false;
    private colors: { [key: string]: string };
    private letterWidth: number;
    private columnSpacing: number;

    constructor(
        svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
        data: SequenceLogoData
    ) {
        this.svg = svg;
        this.dimensions = data.dimensions;
        this.sjData = data.sjData;
        this.xScale = data.xScale;
        this.letterWidth = data.letterWidth ?? 20; // Default letter width
        this.columnSpacing = data.columnSpacing ?? 1; // Default spacing between columns
        this.colors = data.colors ?? {
            'A': '#4CAF50', // Fresh Green
            'C': '#2196F3', // Bright Blue
            'G': '#FFC107', // Vibrant Amber
            'T': '#F44336', // Bold Red
            'N': '#9E9E9E'  // Cool Gray
        };
        
        // Use provided yScale if available, otherwise initialize a new scale
        this.yScale = data.yScale ?? d3.scaleLinear();
        this.useProvidedYScale = data.yScale !== undefined;
    }

    private createBackgroundRect(): void {
        this.svg.append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", this.dimensions.width)
            .attr("height", this.dimensions.height)
            .attr("fill", "none")
            .attr("stroke", "black")
            .attr("stroke-width", "3");
    }

    public get_yScale(): d3.ScaleLinear<number, number> {
        return this.yScale;
    }

    private calculateInformationContent(frequencies: { [key: string]: number }): number {
        const totalFreq = Object.values(frequencies).reduce((a, b) => a + b, 0);
        if (totalFreq === 0) return 0;
        
        const normalizedFreqs = Object.values(frequencies).map(f => f / totalFreq);
        const entropy = normalizedFreqs.reduce((sum, p) => {
            if (p > 0) {
                return sum - (p * Math.log2(p));
            }
            return sum;
        }, 0);
        
        return 2 - entropy; // 2 bits is the maximum information content for DNA
    }

    // Create a character path for a given letter
    private createLetterPath(letter: string): string {
        // Define character paths (simplified versions of A, C, G, T, N)
        // These are basic SVG path definitions for each character
        const paths: { [key: string]: string } = {
            'A': 'M0,100 L50,0 L100,100 L75,100 L65,80 L35,80 L25,100 Z M40,60 L60,60 L50,40 Z',
            'C': 'M100,25 C100,10 90,0 50,0 C10,0 0,25 0,50 C0,75 10,100 50,100 C90,100 100,90 100,75 L75,75 C75,85 70,90 50,90 C30,90 25,75 25,50 C25,25 30,10 50,10 C70,10 75,15 75,25 Z',
            'G': 'M100,25 C100,10 90,0 50,0 C10,0 0,25 0,50 C0,75 10,100 50,100 C90,100 100,90 100,75 L75,75 C75,85 70,90 50,90 C30,90 25,75 25,50 C25,25 30,10 50,10 C70,10 75,25 75,40 L50,40 L50,60 L100,60 Z',
            'T': 'M0,0 L100,0 L100,20 L60,20 L60,100 L40,100 L40,20 L0,20 Z',
            'N': 'M0,100 L0,0 L25,0 L75,75 L75,0 L100,0 L100,100 L75,100 L25,25 L25,100 Z'
        };
        
        return paths[letter] || '';
    }

    public plot(): void {
        // Clear any existing content
        this.svg.selectAll("*").remove();

        this.createBackgroundRect();

        // If yScale is not provided, set it to [0, 2] for bits of information
        if (!this.useProvidedYScale) {
            this.yScale = d3.scaleLinear()
                .domain([0, 2])
                .range([this.dimensions.height, 0]);
        }

        // Calculate column width based on data positions
        this.calculateOptimalColumnWidth();

        // Process and plot sequence data
        this.sjData.getData().forEach(pos => {
            const x = this.xScale(pos.position);
            
            // Calculate frequencies and information content
            const total = pos.A + pos.C + pos.G + pos.T + pos.N;
            const frequencies = {
                'A': pos.A / total,
                'C': pos.C / total,
                'G': pos.G / total,
                'T': pos.T / total,
                'N': pos.N / total
            };

            const informationContent = this.calculateInformationContent(frequencies);

            // Sort nucleotides by frequency for stacking (smallest at the bottom)
            const sortedNucs = Object.entries(frequencies)
                .filter(([_, freq]) => freq > 0)
                .sort(([, a], [, b]) => a - b);
            
            // Calculate column height in bits
            const columnHeightInBits = sortedNucs.reduce((sum, [_, freq]) => {
                return sum + freq * informationContent;
            }, 0);
            
            // Create a group for each position - center the column on its x position
            const posGroup = this.svg.append("g")
                .attr("transform", `translate(${x - this.letterWidth / 2}, 0)`)
                .attr("class", "sequence-column");
            
            // Stack letters from bottom to top
            let yOffset = this.dimensions.height; // Start at the bottom
            
            sortedNucs.forEach(([nuc, freq]) => {
                // Calculate the height of this letter in pixels
                const heightProportion = freq * informationContent / columnHeightInBits;
                const letterHeight = this.dimensions.height * heightProportion;
                
                // Create a group for this letter that will handle scaling
                const letterGroup = posGroup.append("g")
                    .attr("transform", `translate(0, ${yOffset - letterHeight})`);
                
                // Add the letter as a path that will be scaled
                letterGroup.append("path")
                    .attr("d", this.createLetterPath(nuc))
                    .attr("fill", this.colors[nuc])
                    .attr("transform", `scale(${this.letterWidth / 100}, ${letterHeight / 100})`)
                    .attr("stroke", "rgba(0,0,0,0.2)")
                    .attr("stroke-width", "1");
                
                // Update yOffset for next letter
                yOffset -= letterHeight;
            });
        });
    }

    // Calculate optimal column width based on the x-scale and number of data points
    private calculateOptimalColumnWidth(): void {
        const data = this.sjData.getData();
        if (data.length <= 1) return;
        
        // Get array of positions to analyze spacing
        const positions = data.map(d => d.position).sort((a, b) => a - b);
        
        // Find minimum spacing between positions
        let minSpacing = Infinity;
        for (let i = 1; i < positions.length; i++) {
            const spacing = positions[i] - positions[i-1];
            if (spacing < minSpacing) minSpacing = spacing;
        }
        
        // Calculate available width for each column in pixels
        const pixelsPerUnit = Math.abs(this.xScale(positions[0] + minSpacing) - this.xScale(positions[0]));
        
        // Set letter width to fit within available space with spacing
        this.letterWidth = Math.min(
            this.letterWidth, // Don't exceed specified max width
            pixelsPerUnit / this.columnSpacing - 2 // Leave small margin between columns
        );
        
        // Ensure minimum reasonable width
        this.letterWidth = Math.max(10, this.letterWidth);
    }
}
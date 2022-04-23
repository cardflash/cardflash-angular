import { AfterViewInit, Component, Input, OnInit, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import * as d3 from 'd3';
import { environment } from 'src/environments/environment';
import { DataApiService, NoteEntry } from '../data-api.service';
@Component({
  selector: 'app-graph',
  encapsulation: ViewEncapsulation.None,
  templateUrl: './graph.component.html',
  styleUrls: ['./graph.component.scss'],
})
export class GraphComponent implements OnInit, AfterViewInit {
  private noteID?: string;
  @Input('noteID') set selectedNoteID(value: string) {
    this.noteID = value;
    if (this.noteID) {
      console.log('refresh from input');
      // if (this.firstSimDone) {
      //   this.refreshData();
      // }

      this.mainNode = this.nodes.find((n) => n.id === this.noteID);
      this.updateHighlightedNode(this.noteID);
    }
  }

  private notes: NoteEntry[] = [];
  private nodes: { id: string; name: string; group: number; url: string, x?: number, y?: number }[] = [];
  public mainNode: any;
  private ticked: any;
  private simulation: any;
  private width: number = 0;
  private height: number = 0;
  private firstSimDone = false;
  private link_els? :d3.Selection<SVGLineElement, {
    source: string;
    target: string;
    value: number;
}, SVGGElement, unknown>;
  private circles_els? : d3.Selection<SVGCircleElement, {
    id: string;
    name: string;
    group: number;
    url: string;
}, SVGGElement, unknown>;
  // private graph_nodes? : any;
  private zoom?: d3.ZoomBehavior<Element, any>;
  private links: { source: string; target: string; value: number }[] = [];
  constructor(private dataApi: DataApiService, private router: Router) {}

  async ngOnInit() {
    this.refreshData();
  }

  ngAfterViewInit(): void {
    console.log('refresh from ngAfterViewInit');
    console.log(this.nodes, this.links);
  }

  async refreshData() {
    this.notes = await this.dataApi.listNotes(true);
    this.nodes = this.notes.map((note) => {
      return {
        id: note.$id,
        name: note.title,
        group: note.$id === this.noteID ? 1 : 0,
        url: '/notes/' + note.$id,
      };
    });
    const domParser = new DOMParser();
    this.links = [];
    this.notes.forEach((note) => {
      const dom = domParser.parseFromString(note.content, 'text/html');
      dom.querySelectorAll('a.mention').forEach((el) => {
        const data_mention = el.getAttribute('data-mention')?.replace('[[', '').replace(']]', '');
        if (data_mention) {
          const target = data_mention;
          if (target && this.nodes.find((n) => n.id === target)) {
            this.links.push({
              source: note.$id,
              target: target,
              value: 200 / (dom.querySelectorAll('a.mention').length * 30),
            });
          }
        }
      });
    });
    console.log('refresh from refreshData');
    this.createGraph();
  }

  createGraph() {
    var svg = d3.select('#graph'),
      width = +svg.attr('width'),
      height = +svg.attr('height');
    console.log({ svg, width, height });

    svg.selectAll('*').remove();
    const svg_el = document.getElementById('graph');
    if (svg_el instanceof SVGElement) {
      height = svg_el.getBoundingClientRect().height;
      width = svg_el.getBoundingClientRect().width;
    }
    svg
      .attr('viewBox', [-width / 2, -height / 2, width, height])
      .attr('preserveAspectRatio', 'xMinYMin meet');
    svg.attr('transform', 'none');
    this.width = width;
    this.height = height;
    let zoom = d3
      .zoom()
      .extent([
        [0, 0],
        [width, height],
      ])
      .scaleExtent([0.01, 15])
      .on('zoom', (e) => {
        this.firstSimDone = true;
        svg.selectAll('g').attr('transform', e.transform);
        this.ticked();
        // svg.attr("transform",e.transform)
      });
    this.zoom = zoom;
    svg.call(zoom as any);
    const graph = { nodes: this.nodes, links: this.links };
    const collisionForce = Math.max(Math.sqrt(this.nodes.length) * 3, 50);
    console.log({ collisionForce }, this.nodes.length);
    var simulation = d3
      .forceSimulation()
      .force(
        'link',
        d3.forceLink().id(function (d) {
          return (d as any).id;
        })
      )
      .force('charge', d3.forceManyBody())
      // .force("center", d3.forceCenter(0, 0))
      // .force("center", d3.forceCenter(0, 0).strength(0.2))
      // .force('x', d3.forceX())
      // .force('y', d3.forceY())
      .force(
        'collide',
        d3.forceCollide((d) => {
          return collisionForce;
        })
      );
    // .alphaDecay(0.1);
    this.simulation = simulation;
    // .force('collide', d3.forceCollide((d : any) => {
    //   return Math.min(300 / this.nodes.length,50)}));

    var link = svg
      .append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(graph.links)
      .enter()
      .append('line')
      .attr('stroke-width', function (d) {
        return Math.sqrt(d.value);
      })
      .attr('style', (d: any) => {
        if (d.source === this.noteID) {
          return 'stroke: #ff77c9';
        } else if (d.target === this.noteID) {
          return 'stroke: #81fdff';
        } else {
          return 'stroke: #c2c2c2';
        }
        return '';
      });
    this.link_els = link;
    // console.log({ link });

    var node = svg
      .append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(graph.nodes)
      .enter()
      .append('g')
      .on('click', (e, d) => {
        this.router.navigateByUrl('/notes/' + d.id);
      })
      .style('cursor', 'pointer');

    // .filter((d)=> d.id === this.noteID).ce;

    const colors = ['#1f77b4', '#aa00ff'];
    var circles = node
      .append('circle')
      .attr('r', 7)
      .attr('fill', function (d) {
        return colors[d.group];
      })
      .attr('style', function (d) {
        if (d.group === 1) {
          return 'stroke: #7900ff';
        } else {
          return '';
        }
      });
      this.circles_els = circles;
    // Create a drag handler and append it to the node object instead
    var drag_handler = d3.drag().on('start', dragstarted).on('drag', dragged).on('end', dragended);

    drag_handler(node as any);

    var labels = node
      .append('text')
      .text(function (d) {
        return d.name;
      })
      .attr('x', 6)
      .attr('y', 3);

    node.append('title').text(function (d) {
      return d.name;
    });

    this.ticked = () => {
      link
        .attr('x1', function (d: any) {
          return d.source.x;
        })
        .attr('y1', function (d: any) {
          return d.source.y;
        })
        .attr('x2', function (d: any) {
          return d.target.x;
        })
        .attr('y2', function (d: any) {
          return d.target.y;
        });

      node.attr('transform', (d: any) => {
        return 'translate(' + d.x + ',' + d.y + ')';
      });
    };
    simulation
      .nodes(graph.nodes as any)
      .on('tick', this.ticked)
      .on('end', () => {
        // layout is done
        // this.centerMainNode();
        this.firstSimDone = true;
        // if (!this.firstSimDone) {
        // }
      });

    (simulation?.force('link') as any).links(graph.links);

    function dragstarted(event: any, d: any) {
      // if (!event.active) simulation.alphaTarget(0.01).restart();
      if (!event.active) simulation.alphaTarget(0.05).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    this.mainNode = graph.nodes.find((n) => n.id === this.noteID);

    this.centerMainNode();
  }

  centerMainNode() {
    if (this.mainNode) {
      var svg = d3.select('#graph');
      console.log('mainNode', this.mainNode, this.zoom, { svg });
      console.log(this.width, this.height);
      this.zoom?.translateTo(
        svg as any,
        this.mainNode.x + this.width / 2,
        this.mainNode.y + this.height / 2
      );
      this.zoom?.scaleTo(svg as any, 1);
      // svg.selectAll('g').attr('transform',`translate(${Math.round(-this.mainNode.x)},${Math.round(-this.mainNode.y)})`);
      // const svg = document.getElementById('graph');
      // const nodes = svg?.querySelector('g.nodes');
      // const links = svg?.querySelector('g.links');
      // nodes?.setAttribute('transform',`translate(${Math.round(-this.mainNode.x)},${Math.round(-this.mainNode.y)})`);
      // links?.setAttribute('transform',`translate(${Math.round(-this.mainNode.x)},${Math.round(-this.mainNode.y)})`);
      //   this.mainNode.fx = 0;
      //   this.mainNode.fy = 0;
      //   this.mainNode.vx = 0;
      //   this.mainNode.vy = 0;
      //   var svg = d3.select('#graph');
      //   svg.attr('transform', 'none');
      //   svg.select('g.links').attr("transform","none");
      //   svg.select('g.nodes').attr("transform","none");
      //   this.simulation.alphaTarget(0.1)//.restart();
    }
  }

  downloadGraph() {
    const svg = document.getElementById('graph');
    if (svg) {
      // const transform = svg.getAttribute('transform') || 'none';
      // const transformLinks = svg.querySelector('g.links')?.getAttribute('transform') || 'none';
      // const transformNodes = svg.querySelector('g.nodes')?.getAttribute('transform') || 'none';
      // console.log({svg,transform,transformLinks,transformNodes})
      // svg.setAttribute('transform','none')
      // svg.querySelector('g.links')?.setAttribute('transform','scale(0.2)')
      // svg.querySelector('g.nodes')?.setAttribute('transform','scale(0.2)')
      let xmlSerializer = new XMLSerializer();
      const content = xmlSerializer.serializeToString(svg);
      const svgBlob = new Blob([content], { type: 'image/svg+xml;charset=utf-8' });
      const svgURL = URL.createObjectURL(svgBlob);
      const a = document.createElement('a');
      a.href = svgURL;
      a.download = new Date().toISOString() + '-graph.svg';
      document.body.append(a);
      a.click();
      document.body.removeChild(a);
      // svg.setAttribute('transform',transform);
      // svg.querySelector('g.links')?.setAttribute('transform',transformLinks);
      // svg.querySelector('g.nodes')?.setAttribute('transform',transformNodes);
    }
  }

  updateHighlightedNode(newNodeId: string){
    console.log('update highlighted node!');
    console.log(this.circles_els,{newNodeId});
    if(this.circles_els){
      const colors = ['#1f77b4', '#aa00ff'];


      this.circles_els
      .attr('fill', function (d) {
        if(d.id === newNodeId){
          return colors[1];
        }else{
          return colors[0];
        }
      })
      .attr('style', function (d) {
        if (d.id === newNodeId) {
          return 'stroke: #7900ff';
        } else {
          return '';
        }
      });
    }
    if(this.link_els){
      this.link_els.attr('style', (d: any) => {
        // console.log({d})
        if (d.source.id === newNodeId) {
          return 'stroke: #ff77c9';
        } else if (d.target.id === newNodeId) {
          return 'stroke: #81fdff';
        } else {
          return 'stroke: #c2c2c2';
        }
      });
    }
    this.centerMainNode();
  }
}

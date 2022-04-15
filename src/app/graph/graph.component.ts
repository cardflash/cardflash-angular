import { AfterViewInit, Component, Input, OnInit, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import * as d3 from 'd3';
import { environment } from 'src/environments/environment';
import { DataApiService, NoteEntry } from '../data-api.service';
@Component({
  selector: 'app-graph',
  encapsulation: ViewEncapsulation.None,
  templateUrl: './graph.component.html',
  styleUrls: ['./graph.component.scss']
})
export class GraphComponent implements OnInit, AfterViewInit {

  @Input('noteID') noteID? : string;

  private notes: NoteEntry[] = [];
  private nodes: {id: string, name: string, group: number, url: string}[] = [];
  private links: {source: string, target: string, value: number}[] = [];
  constructor(private dataApi: DataApiService, private router: Router) { }

  async ngOnInit() {
  }
  
  
  ngAfterViewInit(): void {
    this.refreshData();
    console.log(this.nodes,this.links)
  }

  async refreshData(){
    this.notes = await this.dataApi.listNotes(true);
    this.nodes = this.notes.map((note) => {return {id: note.$id, name: note.title, group: note.$id === this.noteID ? 1 : 0, url: '/notes/'+note.$id}});
    const domParser = new DOMParser();
    this.links = [];
    this.notes.forEach((note) => {
      const dom = domParser.parseFromString(note.content,'text/html');
      dom.querySelectorAll('a.mention').forEach((el) => {
        const data_mention = el.getAttribute('data-mention')?.replace('[[','').replace(']]','');
        if(data_mention){
          const target = data_mention;
          if(target && this.nodes.find((n) => n.id === target)){
            this.links.push({source: note.$id, target: target, value: 200/(dom.querySelectorAll('a.mention').length*30)})
          }
        }
      })
    })
    console.log(this.nodes,this.links)
    this.createGraph();
  }


  createGraph(){
    var svg = d3.select("#graph"),
    width = +svg.attr("width"),
    height = +svg.attr("height");
    console.log({svg})
    svg.selectAll('*').remove();
    const svg_el = document.getElementById('graph');
    if(svg_el instanceof SVGElement){
      height = svg_el.getBoundingClientRect().height;
      width = svg_el.getBoundingClientRect().width;
    }
    svg.attr("viewBox",[-width/2,-height/2,width,height])
    .attr("preserveAspectRatio", "xMinYMin meet");
    svg.attr('transform','none')
    let zoom = d3.zoom()
    .extent([[0, 0], [width, height]])
    .scaleExtent([0.2, 15]).on("zoom",(e) => {
      svg.selectAll('g').attr("transform",e.transform);
      ticked()
      // svg.attr("transform",e.transform)
    });
    svg.call(zoom as any);

var simulation = d3.forceSimulation()
.force("link", d3.forceLink().id(function(d) { return (d as any).id; }))
.force("charge", d3.forceManyBody())
// .force("center", d3.forceCenter(0, 0))
.force("x", d3.forceX())
.force("y",d3.forceY())
.force('collide', d3.forceCollide(function(d){
  return 35}));
  // .force('collide', d3.forceCollide((d : any) => {
  //   return Math.min(300 / this.nodes.length,50)}));
const graph = {"nodes": [...this.nodes
],
"links": [...this.links]}

var link = svg.append("g")
  .attr("class", "links")
.selectAll("line")
.data(graph.links)
.enter().append("line")
  .attr("stroke-width", function(d) { return Math.sqrt(d.value); });
console.log({link})

var node = svg.append("g")
  .attr("class", "nodes")
.selectAll("g")
.data(graph.nodes)
.enter().append("g").on('click',(e,d) => {
  console.log({d,e})
  this.router.navigateByUrl(d.url);
  // window.location.href = d.url;
}).style('cursor','pointer');

const colors = ['#1f77b4','#aa00ff']
var circles = node.append("circle")
.attr("r", 7)
.attr("fill", function(d) { return colors[d.group] });

// Create a drag handler and append it to the node object instead
var drag_handler = d3.drag()
  .on("start", dragstarted)
  .on("drag", dragged)
  .on("end", dragended);

drag_handler(node as any);

var labels = node.append("text")
  .text(function(d) {
    return d.name;
  })
  .attr('x', 6)
  .attr('y', 3);

node.append("title")
  .text(function(d) { return d.name; });

simulation
  .nodes(graph.nodes as any)
  .on("tick", ticked);

(simulation?.force("link") as any).links(graph.links);

function ticked() {
link
    .attr("x1", function(d: any) { return d.source.x; })
    .attr("y1", function(d: any) { return d.source.y; })
    .attr("x2", function(d: any) { return d.target.x; })
    .attr("y2", function(d: any) { return d.target.y; });

node
    .attr("transform", function(d: any) {
      return "translate(" + d.x + "," + d.y + ")";
    })
}


function dragstarted(event: any, d:any) {
  if (!event.active) simulation.alphaTarget(0.3).restart();
  d.fx = d.x;
  d.fy = d.y;
}

function dragged(event: any, d:any) {
  d.fx = event.x;
  d.fy = event.y;
}

function dragended(event: any, d:any) {
  if (!event.active) simulation.alphaTarget(0);
  d.fx = null;
  d.fy = null;
}

  }


}

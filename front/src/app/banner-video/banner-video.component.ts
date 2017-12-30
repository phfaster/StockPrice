import {Component, OnInit, Renderer2} from '@angular/core';

@Component({
  selector: 'app-banner-video',
  templateUrl: './banner-video.component.html',
  styleUrls: ['./banner-video.component.css']
})
export class BannerVideoComponent implements OnInit {
  isLoaded = false;
  video = 'assets/images/banner';

  constructor(private renderer: Renderer2) { }

  ngOnInit() {}

  loaded() {
    this.isLoaded = true;
    this.renderer.removeClass(document.body, 'is-loading');
  }

}

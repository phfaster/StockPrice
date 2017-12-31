import {Component, OnInit, Renderer2} from '@angular/core';

@Component({
  selector: 'app-banner-video',
  templateUrl: './banner-video.component.html',
  styleUrls: ['./banner-video.component.css']
})
export class BannerVideoComponent implements OnInit {
  isLoaded = false;
  video = 'assets/images/banner';
  mediaYes = false;

  constructor(private renderer: Renderer2) { }

  ngOnInit() {
    if (this.getScreenWidth() > 1280) {
      this.mediaYes = true;
    } else {
      this.loaded();
    }
  }

  loaded() {
    this.isLoaded = true;
    this.renderer.removeClass(document.body, 'is-loading');
  }

  getScreenWidth() {
    return window.screen.width;
  }

}

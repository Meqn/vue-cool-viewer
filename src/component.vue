<template>
<transition name="cool-lightbox-modal">
  <div
    v-if="isVisible"
    :id="viewerId"
    :class="['cool-lightbox', ...lightboxClasses, customClass]"
    :style="{ 'z-index': zIndex }">

    <div class="cool-lightbox-mask" :style="{ 'background-color': overlayColor }"></div>

    <!-- 缩略图列表 -->
    <div v-if="toolbarList.includes('gallery') && items.length > 1" class="cool-lightbox-thumbs" :style="{ color: highColor }">
      <div class="cool-lightbox-thumbs__list">
        <i v-for="(item, idx) in items"
          :key="idx"
          :class="['cool-lightbox__thumb', { active: idx === imgIndex }, { 'is-video': $_checkIsVideo(idx) }]"
          @click="imgIndex = idx">
          <img :src="getItemThumb(idx)" loading="lazy" alt="" />
        </i>
      </div>
    </div>
    <!--/cool-lightbox-thumbs-->

    <div
      class="cool-lightbox-inner"
      :style="innerStyles">
      <!-- progressbar -->
      <div class="cool-lightbox-progressbar" :style="stylesInterval"></div>
      <!-- loading -->
      <div v-show="itemLoading" class="cool-lightbox-loading-wrapper">
        <slot name="loading"><div class="cool-lightbox-loading"></div></slot>
      </div>
      <!--/loading-wrapper-->
      <!-- 主体区域 -->
      <!-- 将点击关闭、滑动等事件绑定在该元素上, click 和 touch不能共存 -->
      <div
        ref="content"
        class="cool-lightbox-main"
        @mousedown.prevent.stop="startSwipe"
        @mousemove.prevent.stop="continueSwipe"
        @mouseup.prevent.stop="endSwipe"
        @touchstart.prevent.stop="startSwipe"
        @touchmove.prevent.stop="continueSwipe"
        @touchend.prevent.stop="endSwipe"
        @click.stop="closeModal">
        <div ref="items" class="cool-lightbox-slide">
          <div v-if="currentItem.mediaType === 'image'" ref="imgItem" key="image" :style="mediaWrapStyle" class="cool-lightbox-image">
            <transition name="cool-lightbox-slide-change" mode="out-in">
              <img
                v-load:image
                :data-src="currentItem.src"
                :srcset="currentItem.srcset"
                :sizes="currentItem.sizes"
                :key="imgIndex"
                :alt="currentItem.alt"
                draggable="false"
                @click.stop="zoomImage"
                @mousedown="handleMouseDown($event)"
                @mouseup="handleMouseUp($event)"
                @mousemove="handleMouseMove($event)"
              />
            </transition>
          </div>
          <!--/imgs-slide-->
          <div v-else-if="currentItem.mediaType === 'iframe'" ref="iframeItem" key="iframe" :style="{ ...mediaWrapStyle, ...iframeStyles }" class="cool-lightbox-iframe">
            <transition name="cool-lightbox-slide-change" mode="out-in">
              <iframe
                v-load:iframe
                :data-src="currentItem.src"
                :key="currentItem.src"
                frameborder="0"
                allowfullscreen
                mozallowfullscreen
                webkitallowfullscreen
                oallowfullscreen
                msallowfullscreen>
              </iframe>
            </transition>
          </div>
          <!--/cool-lightbox-iframe-->
          <div v-else ref="videoItem" key="video" class="cool-lightbox-video" :style="{ ...mediaWrapStyle, ...videoStyles }">
            <transition name="cool-lightbox-slide-change" mode="out-in">
              <iframe
                v-if="currentItem.mediaType === 'webVideo'"
                v-load:webVideo
                :data-src="currentItem.src"
                :data-autoplay="video.autoplay"
                :key="currentItem.src"
                frameborder="0"
                scrolling="no"
                allowtransparency="true"
                allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen
                mozallowfullscreen
                webkitallowfullscreen
                oallowfullscreen
                msallowfullscreen>
              </iframe>
              <video
                v-else
                v-load:video
                :data-src="currentItem.src"
                :data-autoplay="video.autoplay"
                :key="currentItem.src"
                playsinline
                controls
                controlslist="nodownload">
                <source :src="currentItem.src" :type="videoSourceType">
                Sorry, your browser doesn't support embedded videos
              </video>
            </transition>
          </div>
          <!--/cool-lightbox-video-->
        </div>
        <!--/cool-lightbox-slide-->
      </div>
      <!--/cool-lightbox__wrapper-->

      <!-- 导航 prev/next -->
      <template v-if="navigator && items.length > 1">
        <div
          v-show="hasPreviousButton || loopData"
          class="cool-lightbox-navigation is-prev"
          :class="buttonsClasses"
          title="Previous"
          @click.stop="previous">
          <slot name="icon-previous"><Icon name="arrow-left" /></slot>
        </div>
        <div
          v-show="hasNextButton || loopData"
          class="cool-lightbox-navigation is-next"
          :class="buttonsClasses"
          title="Next"
          @click.stop="next(false)">
          <slot name="icon-next"><Icon name="arrow-right" /></slot>
        </div>
      </template>
      <!--/cool-lightbox__navigation-->

      <!-- 工具栏 -->
      <div v-if="toolbarList.length > 0" class="cool-lightbox-toolbar" :class="buttonsClasses">
        <div class="cool-lightbox-toolbar__left">
          <span class="cool-lightbox-toolbar__counter" v-if="toolbarList.includes('counter')">{{ imgIndex + 1 }} / {{ items.length }}</span>
        </div>
        <div class="cool-lightbox-toolbar__buttons">
          <i v-if="toolbarList.includes('slide') && items.length > 1" title="Play slideshow" class="icon-btn" @click.stop="toggleSlide">
            <Icon :name="!isPlayingSlideShow ? 'play' : 'pause'" />
          </i>
          <template v-if="toolbarList.includes('rotate')">
            <i title="rotate-left" class="icon-btn" @click.stop="onRotate('left')">
              <Icon name="rotate-left" />
            </i>
            <i title="rotate-right" class="icon-btn" @click.stop="onRotate('right')">
              <Icon name="rotate-right" />
            </i>
          </template>
          <i v-if="toolbarList.includes('gallery') && items.length > 1" @click.stop="showThumbs = !showThumbs" title="Show thumbnails" class="icon-btn">
            <Icon name="grid" />
          </i>
          <i v-if="toolbarList.includes('fullscreen')" @click.stop="toggleFullScreenMode" class="icon-btn" title="Fullscreen">
            <Icon :name="isFullScreenMode ? 'offscreen' : 'fullscreen'" />
          </i>
          <i
            v-if="toolbarList.includes('download')"
            class="icon-btn"
            title="download"
            @click.stop="onDownload">
            <Icon name="download" />
          </i>
          <i v-if="toolbarList.includes('close')" class="icon-btn" title="Close" @click.stop="close">
            <Icon name="close" />
          </i>
        </div>
      </div>
      <!--/cool-lightbox--toolbar-->

      <!-- 标题/描述 -->
      <transition name="cool-lightbox-modal">
        <div v-show="currentItem.title || currentItem.description" key="caption-block" class="cool-lightbox-caption">
          <transition name="cool-lightbox-slide-change" mode="out-in">
            <h6 class="caption-title" v-if="currentItem.title" key="title" v-html="currentItem.title"></h6>
          </transition>

          <transition name="cool-lightbox-slide-change" mode="out-in">
            <div class="caption-description" v-if="currentItem.description" key="description" v-html="currentItem.description"></div>
          </transition>
        </div>
        <!--/cool-lightbox-caption-->
      </transition>

      <!-- 缩放区域 -->
      <transition name="cool-lightbox-modal">
        <div v-if="isZooming" class="cool-lightbox-zoom">
          <Icon name="minus" class="cool-lightbox-zoom__icon" />
          <input type="range" v-model="zoomBarSize" name="points" min="0" max="50" />
          <Icon name="plus" class="cool-lightbox-zoom__icon" />
        </div>
      </transition>
    </div>
    <!--/cool-lightbox-inner-->
  </div>
  <!--/cool-lightbox-->
</transition>
<!--/transition-->
</template>

<script>
import './index.scss'
import LoadMedia from './load.js'
import Icon from './Icon.vue'
import {
  fullScreenMode,
  closeFullscreen,
  addFullscreenListener,
  removeFullscreenListener,
  matchesDom,
  randomStr,
  isObject,
  isNumber,
  isMobile,
  cssUnit,
  getMediaType,
  getMediaThumb,
  getVideoUrl,
  isVideo,
  videoSourceType
} from './utils'

export default {
  name: 'Lightbox',
  components: {
    Icon
  },
  directives: {
    load: LoadMedia
  },
  props: {
    index: Number,
    items: {
      type: Array,
      required: true,
    },
    container: {
      type: [Element, String],
      default: () => document.body
    },
    theme: {
      type: String,
      default: 'dark'
    },
    customClass: String,
    highColor: {
      type: String,
      default: '#fa4242',
    },
    zIndex: {
      type: Number,
      default: 99999,
    },
    overlayColor: String,
    // 导航器
    navigator: {
      type: Boolean,
      default: true
    },
    toolbar: Array,
    loop: {
      type: Boolean,
      default: true,
    },
    slideDuration: {
      type: Number,
      default: 3500,
    },
    showGallery: Boolean,
    galleryPosition: {
      type: String,
      validtor(val) {
        return ['right', 'bottom'].includes(val)
      }
    },
    video: {
      type: Object,
      default: () => ({
        autoplay: 0,
        // width, height, maxWidth, maxHeight
        ratio: 1.77778 // 16 : 9
      })
    },
    iframe: {
      type: Object,
      default: () => ({})
    },
    enableWheelEvent: Boolean,
    enableScrollLock: {
      type: Boolean,
      default: true,
    },
    // 点击关闭
    clickOutsideHide: {
      type: Boolean,
      default: true
    }
  },
  data() {
    return {
      // swipe data
      initialMouseX: 0,
      initialMouseY: 0,
      endMouseX: 0,
      endMouseY: 0,
      swipeType: null,
      IsSwipping: false,
      isDraggingSwipe: false,

      // use for mouse wheel
      prevTime: 0,

      // styles data
      isVisible: false,
      imgIndex: this.index,
      paddingBottom: false,
      itemLoading: false,
      showThumbs: this.showGallery,
      isFullScreenMode: false,

      // aspect ratio videos
      aspectRatio: {
        width: 'auto',
        height: 'auto',
      },

      // props to bind styles
      buttonsVisible: true,
      scale: 1,
      top: 0,
      left: 0,
      lastX: 0,
      lastY: 0,
      isDraging: false,
      canZoom: true,
      isZooming: false,
      zoomBarSize: 0,
      imgTransform: '',

      // rotate
      viewTransition: 'all .3s ease',
      viewRotate: 0,

      // slideshow playing data
      isPlayingSlideShow: false,
      intervalProgress: null,
      loopData: this.loop,
      stylesInterval: {
        'display': 'block'
      },
      $parentEl: null,
      // id
      viewerId: 'viewer-' + randomStr()
    }
  },
  computed: {
    // get item
    currentItem() {
      const index = this.imgIndex
      const item = this.$_getItem(index)
      if (item) {
        item.mediaType = getMediaType(item)
        if (['webVideo', 'video'].includes(item.mediaType)) {
          item.src = getVideoUrl(item.src)
        }

        return item
      }
      return null
    },
    videoSourceType() {
      if (this.currentItem) {
        const { src, ext } = this.currentItem
        return videoSourceType(src, { ext })
      }
      return ''
    },
    // Images wrapper styles to use drag and zoom
    mediaWrapStyle() {
      const styleObj = {
        position: 'absolute',
        top: '50%',
        left: '50%'
      }
      // transition
      if (this.viewTransition) styleObj['transition'] = this.viewTransition

      // transform
      let transform = 'translate3d(-50%, -50%, 0px) scale3d(1, 1, 1)'
      // process image
      if (this.imgTransform && this.currentItem.mediaType === 'image') {
        transform = this.imgTransform
      }
      // all rotate
      if (this.viewRotate) {
        transform += ` rotate(${this.viewRotate}deg)`
      }
      if (transform) {
        styleObj.transform = transform
      }

      return styleObj
    },
    videoRatio() {
      let ratio = 1.77778
      const { currentItem, video } = this
      if (currentItem && currentItem.ratio) {
        ratio = currentItem.ratio
      } else if (video && video.ratio) {
        ratio = video.ratio
      }
      return ratio
    },
    iframeStyles() {
      const styleObj = this.$_getItemSizes(this.iframe)
      return Object.assign({}, this.iframe, styleObj)
    },
    videoStyles() {
      const styleObj = this.$_getItemSizes(this.video)
      const { width, height } = this.aspectRatio

      if (!styleObj.width) styleObj['width'] = width
      if (!styleObj.height) styleObj['height'] = height

      return styleObj
    },
    innerStyles() {
      return {
        'padding-bottom': this.paddingBottom + 'px',
      }
    },
    // Lightbox classes
    lightboxClasses() {
      const classesReturn = [
        { 'is-can-zoom': this.canZoom && !this.disableZoom },
        { 'is-zooming': this.isZooming },
        { 'is-thumbs-show': this.showThumbs },
        { 'is-swipping': this.isDraggingSwipe },
        { 'theme-light': this.theme === 'light' }
      ]

      const { clientWidth, clientHeight } = document.body || document.documentElement
      const galleryPosition = this.galleryPosition ? this.galleryPosition : clientHeight > clientWidth ? 'bottom' : 'right'
      const classString = 'cool-lightbox--thumbs-' + galleryPosition
      classesReturn.push(classString)

      return classesReturn
    },
    // Buttons classes
    buttonsClasses() {
      return {
        'hidden': !this.buttonsVisible,
      }
    },
    // check if the slide has next element
    hasNextButton() {
      return (this.imgIndex + 1 < this.items.length)
    },
    // check if the slide has previous element 
    hasPreviousButton() {
      return (this.imgIndex - 1 >= 0)
    },
    // check if the slide has next element
    hasNext() {
      return (this.imgIndex + 1 < this.items.length)
    },
    // check if the slide has previous element
    hasPrevious() {
      return (this.imgIndex - 1 >= 0)
    },
    toolbarList() {
      const { toolbar, currentItem, items } = this
      if (toolbar && toolbar.length > 1) {
        if (isMobile) {
          return toolbar.filter(tool => {
            return tool !== 'fullscreen' && tool !== 'download'
          })
        }
        return toolbar
      }
      if (items.length === 1) {
        if (currentItem.mediaType === 'image') {
          return ['zoom', 'rotate', 'close']
        } else if (currentItem.mediaType === 'video') {
          return ['rotate', 'close']
        } else {
          return ['close']
        }
      } else {
        if (isMobile) {
          return ['counter', 'zoom', 'slide', 'rotate', 'gallery', 'close']
        }
        return ['counter', 'zoom', 'slide', 'rotate', 'gallery', 'fullscreen', 'download', 'close']
      }
    },
    disableZoom() {
      return !this.toolbarList.includes('zoom')
    }
  },
  watch: {
    zoomBarSize(val, prev) {
      if (this.isZooming) {
        const newZoom = 1.6 + val / 10
        this.imgTransform = `translate3d(calc(-50% + ${this.left}px), calc(-50% + ${this.top}px), 0px) scale3d(${newZoom}, ${newZoom}, ${newZoom})`
      }
    },
    index(val, prev) {
      // 加入`isVisible`判断，防止外界更改index后重新初始化
      if (isNumber(val) && !this.isVisible) {
        this.$_initial(val)
      }
    },
    imgIndex: {
      immediate: true,
      handler(val, prev) {
        if (val !== this.index) {
          this.$emit('update:index', val)
        }
        // 切换预览
        if (val !== null) {
          // 重置loading
          this.changeLoading(false)
          // loading
          this.changeLoading(true)
          // add caption padding to Lightbox wrapper
          this.$_addCaptionPadding()
          // set video aspect ratio
          if (['webVideo', 'video'].includes(this.currentItem.mediaType)) {
            this.$_setAspectRatio(this.videoRatio)
          }
        }
        // reset zoom
        this.resetZoom()
        // reset swipe type
        this.swipeType = null
      }
    }
  },
  mounted() {
    // set container
    this.$_setParentEl()
    
    if (!this.$parentEl) {
      throw Error('container is not valid HTMLElement!')
    }
    // Insert $el
    this.$parentEl.appendChild(this.$el)

    if (isNumber(this.index)) {
      this.$_initial(this.index)

      addFullscreenListener.call(this, this.fullScreenListener)
      this.$once('hook:beforeDestroy', removeFullscreenListener.bind(this, this.fullScreenListener))
    }
  },
  destroyed() {
    if (this.enableScrollLock) {
      this.$_disableBodyLock()
    }
    // remove lightbox element
    if (this.$el && this.$el.parentNode) {
      this.$el.parentNode.removeChild(this.$el)
    }
    if (this.$parentEl) this.$parentEl = null
  },
  methods: {
    $_enableBodyLock() {
      document.body.classList.add('compensate-for-scrollbar')
    },
    $_disableBodyLock() {
      document.body.classList.remove('compensate-for-scrollbar')
    },
    $_setParentEl() {
      const { container } = this
      if (container instanceof HTMLElement) {
        this.$parentEl = container
      } else if (typeof container === 'string') {
        this.$parentEl = document.querySelector(container)
      }
    },
    $_getItemSizes(obj) {
      const styleObj = {}
      let { width, height, maxWidth, maxHeight } = this.currentItem

      if (isObject(obj)) {
        width = width || obj.width
        height = height || obj.height
        maxWidth = maxWidth || obj.maxWidth
        maxHeight = maxHeight || obj.maxHeight
      }

      width && (styleObj.width = cssUnit(width))
      height && (styleObj.height = cssUnit(height))
      maxWidth && (styleObj['max-width'] = cssUnit(maxWidth))
      maxHeight && (styleObj['max-height'] = cssUnit(maxHeight))

      return styleObj
    },
    $_setAspectRatio(ratio) {
      this.$nextTick(() => {
        const $el = this.$refs['content']
        if ($el) {
          const { width, height } = $el.getBoundingClientRect()
          if ((width / height) > ratio) {
            this.aspectRatio = {
              width: `${Math.floor(height * ratio)}px`,
              height: `${Math.floor(height)}px`
            }
          } else {
            this.aspectRatio = {
              width: `${Math.floor(width)}px`,
              height: `${Math.floor(width / ratio)}px`
            }
          }
        }
      })
    },
    toggleFullScreenMode() {
      if (this.isFullScreenMode) {
        closeFullscreen()
      } else {
        fullScreenMode()
      }
    },
    fullScreenListener() {
      this.isFullScreenMode = !this.isFullScreenMode
    },
    onRotate(dir) {
      if (dir === 'left') {
        this.viewRotate += -90
      } else if (dir === 'right') {
        this.viewRotate += 90
      }
    },
    onDownload() {
      console.log('download')
    },
    // check if event is arrow button or toolbar button
    $_checkOutOfSwipe(event) {
      if (event.type.includes('mouse')) {
        const elements = [
          '.cool-lightbox-video video',
          '.cool-lightbox-video iframe',
          '.cool-lightbox-iframe iframe'
        ]
        return matchesDom(event.target, elements, event.currentTarget)
      }
      return false
    },
    // start swipe event
    startSwipe(event) {
      if (this.isZooming) {
        return false
      }

      // check if is some button
      if (this.$_checkOutOfSwipe(event)) {
        return false
      }

      // starts swipe
      this.isDraggingSwipe = true
      this.initialMouseX = this.$_getMouseXPosFromEvent(event)
      this.initialMouseY = this.$_getMouseYPosFromEvent(event)
    },

    // continue swipe event
    continueSwipe(event) {
      if (this.isDraggingSwipe) {
        this.IsSwipping = true
        const currentPosX = this.$_getMouseXPosFromEvent(event)
        const currentPosY = this.$_getMouseYPosFromEvent(event)
        // const windowWidth = this.lightboxInnerWidth

        // diffs
        const diffX = Math.abs(currentPosX - this.initialMouseX)
        const diffY = Math.abs(currentPosY - this.initialMouseY)

        // swipe type
        if (this.swipeType == null) {
          if (diffY > 5 || diffX > 5) {
            if (diffY > diffX) {
              this.swipeType = 'v'
            } else {
              this.swipeType = 'h'
            }
          }
        }
        // mobile caseS
        if (event.type === 'touchmove') {
          this.endMouseX = this.$_getMouseXPosFromEvent(event)
          this.endMouseY = this.$_getMouseYPosFromEvent(event)
        }
      }
    },

    // end swipe event
    endSwipe(event) {
      if (this.$_checkOutOfSwipe(event) && this.initialMouseX === 0) {
        return false
      }

      // event check is dragging and swipe
      const swipeType = this.swipeType
      this.isDraggingSwipe = false

      // horizontal swipe type
      if (this.initialMouseX === 0 && swipeType == 'h') {
        return false
      }

      // touch end fixes
      if (event.type !== 'touchend') {
        this.endMouseX = this.$_getMouseXPosFromEvent(event)
        this.endMouseY = this.$_getMouseYPosFromEvent(event)
      } else {
        if (this.endMouseX === 0) {
          return
        }
      }

      // check if is dragged
      if (
        ((this.endMouseX - this.initialMouseX === 0) && swipeType === 'h') ||
        this.isZooming ||
        ((this.endMouseY - this.initialMouseY === 0) && swipeType === 'v')
      ) {
        return
      }

      // reset swipe data
      setTimeout(() => {
        this.IsSwipping = false
        this.initialMouseX = 0
        this.endMouseX = 0
      }, 10)

      // type of swipe
      if (this.swipeType === 'h') {
        // if the swipe is to the right
        if ((this.endMouseX - this.initialMouseX) < -40) {
          return this.changeIndexToNext()
        }
        // if the swipe is to the left
        if ((this.endMouseX - this.initialMouseX) > 40) {
          return this.changeIndexToPrev()
        }
      }
      if (this.swipeType === 'v') {
        const diffY = Math.abs(this.endMouseY - this.initialMouseY)
        // diff Y
        if (diffY >= 90) this.close()
      }
      this.swipeType = null
    },

    // function that return x position from event
    $_getMouseXPosFromEvent(event) {
      if (event.type.indexOf('mouse') !== -1) {
        return event.clientX
      }
      return event.touches[0].clientX
    },
    // function that return Y position from event
    $_getMouseYPosFromEvent(event) {
      if (event.type.indexOf('mouse') !== -1) {
        return event.clientY
      }
      return event.touches[0].clientY
    },

    // toggle play slideshow event
    toggleSlide() {
      if (!this.toolbarList.includes('slide')) {
        return false
      }

      if (!this.hasNext && !this.loopData) {
        return false
      }
      this.isPlayingSlideShow = !this.isPlayingSlideShow

      // if is playing move if not stop it
      if (this.isPlayingSlideShow) {
        this.move()
      } else {
        this.stopSlideShow()
      }
    },

    // stop slideshow
    stopSlideShow() {
      this.isPlayingSlideShow = false
      clearInterval(this.intervalProgress)
      this.stylesInterval = {
        'transform': 'scaleX(0)',
        'transition': 'none',
      }
    },
    // move event in zoom
    move() {
      const self = this
      this.progressWidth = 100
      this.intervalProgress = setInterval(frame, this.slideDuration + 90)
      this.stylesInterval = {
        'transform': 'scaleX(1)',
        'background': this.highColor,
        'transition-duration': this.slideDuration + 'ms',
      }
      function frame() {
        self.stylesInterval = {
          'transform': 'scaleX(0)',
          'transition': 'none',
        }
        self.next(true)

        if (!self.hasNext && !self.loopData) {
          self.stopSlideShow()
        } else {
          setTimeout(function() {
            self.stylesInterval = {
              'transform': 'scaleX(1)',
              'background': self.highColor,
              'transition-duration': self.slideDuration+'ms',
            }
          }, 50)
        }
      }
    },
    // check if is allowed to drag
    $_checkMouseEventPropButton(button) {
      if (!this.isZooming) return false
      // mouse left btn click
      return button === 0
    },

    // handle mouse down event
    handleMouseDown(e) {
      if (!this.$_checkMouseEventPropButton(e.button)) return
      this.lastX = e.clientX
      this.lastY = e.clientY
      this.isDraging = true
      e.stopPropagation()
    },

    // handle mouse up event
    handleMouseUp(e) {
      if (!this.$_checkMouseEventPropButton(e.button)) return
      this.isDraging = false
      this.lastX = this.lastY = 0

      // Fix drag zoom out
      const thisContext = this
      setTimeout(function() {
        thisContext.canZoom = true
      }, 100)
    },

    // handle mouse move event
    handleMouseMove(e) {
      if (!this.$_checkMouseEventPropButton(e.button)) return
      if (this.isDraging) {
        this.top = this.top - this.lastY + e.clientY
        this.left = this.left - this.lastX + e.clientX
        this.lastX = e.clientX
        this.lastY = e.clientY
        this.canZoom = false

        const newZoom = 1.6 + this.zoomBarSize / 10
        this.imgTransform = `translate3d(calc(-50% + ${this.left}px), calc(-50% + ${this.top}px), 0px) scale3d(${newZoom}, ${newZoom}, ${newZoom})`
      }
      e.stopPropagation()
    },

    // zoom image event
    zoomImage() {
      if (this.disableZoom) return false
      if (window.innerWidth < 700) return false
      if (!this.canZoom) return false
      if (this.IsSwipping) return false

      // item zoom
      // zoom variables
      const isZooming = this.isZooming
      // Is zooming check
      if (isZooming) {
        if (!this.isDraging) { 
          this.isZooming = false
          this.zoomBarSize = 0
        }
      } else {
        this.isZooming = true
      }
      // check if is zooming
      if (this.isZooming) {
        this.stopSlideShow()
        // add scale
        this.imgTransform = 'translate3d(calc(-50%), calc(-50%), 0px) scale3d(1.6, 1.6, 1.6)'
        // hide buttons
        this.buttonsVisible = false
        // fix drag transition problems
        setTimeout(() => {
          this.viewTransition = 'all 0s ease'
        }, 10)
      } else {
        // show buttons
        this.buttonsVisible = true
        this.resetZoom()
      }
    },

    // Reset zoom data
    resetZoom() {
      this.scale = 1
      this.left = 0
      this.top = 0
      this.zoomBarSize = 0
      this.isZooming = false
      this.swipeType = null
      this.viewTransition = 'all .3s ease'
      // `this.$nextTick` is to fix imageZoom transition problems
      this.$nextTick(() => {
        // only if index is not null
        if (this.imgIndex != null) {
          // reset styles
          if (this.disableZoom) {
            this.imgTransform = `translate3d(calc(-50% + ${this.left}px), calc(-50% + ${this.top}px), 0px)`
          } else {
            this.imgTransform = `translate3d(calc(-50% + ${this.left}px), calc(-50% + ${this.top}px), 0px) scale3d(1, 1, 1)`
          }

          this.initialMouseX = 0
          if (window.innerWidth >= 700) {
            this.buttonsVisible = true
          }
        }
      })
    },
    resetRotate() {
      if (this.viewRotate) {
        this.viewTransition = 'all 0s ease'
        this.viewRotate = 0
        setTimeout(() => {
          this.viewTransition = 'all .3s ease'
        }, 100)
      }
    },
    $_wheelEvent(event) {
      const delay = 350
      const currentTime = new Date().getTime()
      const direction = event.deltaY > 0 ? 'top' : 'down'

      if (currentTime - this.prevTime < delay) return

      this.prevTime = currentTime

      switch (direction) {
        case 'top':
          this.changeIndexToPrev()
          break
        case 'down':
          this.changeIndexToNext()
          break
      }
    },
    // caption size
    $_addCaptionPadding() {
      this.$nextTick(() => {
        if (this.currentItem.title || this.currentItem.descripcion) {
          const el = this.$el.querySelector('.cool-lightbox-caption')
          if (el) {
            this.paddingBottom = el.offsetHeight
          }
        } else {
          this.paddingBottom = 0
        }
      })
    },
    // =======================================================================================
    $_initial(index) {
      // swipe type
      this.swipeType = null
      this.initialMouseY = 0

      this.isVisible = true
      this.imgIndex = index

      // add events listener
      window.addEventListener('keydown', this.$_eventListener)

      // add wheel event
      if (this.enableWheelEvent) {
        window.addEventListener('wheel', this.$_wheelEvent)
      }
      this.$nextTick(() => {
        if (this.enableScrollLock) {
          // lock body
          this.$_enableBodyLock()
        }
        this.$emit('open', this.imgIndex)
      })
    },
    open(index) {
      if (this.isVisible && isNumber(this.imgIndex)) {
        if (index !== this.imgIndex) {
          this.change(index)
        }
      } else {
        this.$_initial(index)
      }
    },
    // close event
    close() {
      // hide and stop slideshow
      this.isVisible = false
      this.imgIndex = null
      this.stopSlideShow()
      this.resetRotate()
      this.resetZoom()
      // this.showThumbs = false

      // set starts X to 0
      this.startsX = 0
      this.initialMouseY = 0
      // reset swipe type
      this.swipeType = null

      // finish swipe
      this.isDraggingSwipe = false
      this.isZooming = true

      // remove events listener
      window.removeEventListener('keydown', this.$_eventListener)
      // remove body locked
      if (this.enableScrollLock) {
        this.$_disableBodyLock()
      }
      // remove wheel event
      if (this.enableWheelEvent) {
        window.removeEventListener('wheel', this.$_wheelEvent)
      }

      this.$emit('close')
    },
    closeModal(event) {
      if (!this.clickOutsideHide) return false
      // 加载中
      if (this.itemLoading) return false
      if (this.IsSwipping) return false

      const elements = [
        'img',
        'video',
        'iframe',
        'picture',
        'source',
        'svg',
        'path'
      ]
      // 如果点击元素包含 elements，则不关闭
      // 使用`event.currentTarget`，将检测区域缩到最小
      if (!matchesDom(event.target, elements, event.currentTarget)) {
        this.close()
      }
    },

    // next slide event
    next(isFromSlideshow = false) {
      if (this.isZooming) {
        return false
      }
      if (!isFromSlideshow) {
        this.stopSlideShow()
      }
      this.changeIndexToNext()
    },

    // prev slide event
    previous(isFromSlideshow = false) {
      if (this.isZooming) {
        return false
      }
      if (!isFromSlideshow) {
        this.stopSlideShow()
      }
      this.changeIndexToPrev()
    },

    // change to next index
    changeIndexToNext() {
      if (this.hasNext) {
        this.change(this.imgIndex + 1)
      } else {
        // only if has loop prop
        if (this.loopData) {
          this.change(0)
        }
      }
    },

    // change to prev index
    changeIndexToPrev() {
      if (this.hasPrevious) {
        this.change(this.imgIndex - 1)
      } else {
        // only if has loop prop
        if (this.loopData) {
          this.change(this.items.length - 1)
        }
      }
    },
    // index change
    change(index) {
      this.imgIndex = index
      this.$emit('change', index)

      setTimeout(() => {
        this.$emit('change-end', index)
      }, 350)
    },
    $_getItem(index) {
      try {
        const item = this.items[index]
        if (item) {
          return isObject(item) ? item : { src: item }
        }
        return {}
      } catch (error) {
        return {}
      }
    },
    $_checkIsVideo(index) {
      const item = this.$_getItem(index)
      const { mediaType, src } = item
      return mediaType ? ['video', 'webVideo'].includes(mediaType) : isVideo(src)
    },
    // get item thumbnail
    getItemThumb(index) {
      const item = this.$_getItem(index)
      return getMediaThumb(item)
    },
    // arrows and escape events
    $_eventListener(e) {
      switch (e.keyCode) {
        case 39:
          return this.next()
        case 37:
          return this.previous()
        case 38:
        case 40:
        case ' ':
          return e.preventDefault()
        case 27:
          return this.close()
      }
    },
    changeLoading(val) {
      this.itemLoading = val
    }
  }
}
</script>

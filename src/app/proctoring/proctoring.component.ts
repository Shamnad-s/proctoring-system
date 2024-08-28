import { Component, ViewChild, ElementRef, OnInit } from '@angular/core';

@Component({
  selector: 'app-proctoring',
  templateUrl: './proctoring.component.html',
  styleUrls: ['./proctoring.component.css'],
})
export class ProctoringComponent implements OnInit {
  @ViewChild('videoElement', { static: true })
  videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('overlayCanvas', { static: true })
  overlayCanvas!: ElementRef<HTMLCanvasElement>;

  mediaStream!: MediaStream;
  mediaRecorder!: MediaRecorder;
  recordedChunks: Blob[] = [];
  notificationMessage: string | null = null;
  notificationType: 'info' | 'warning' | 'error' = 'info';
  context!: CanvasRenderingContext2D;
  isProctoringActive: boolean = false;
  ngOnInit() {
    this.trackTabSwitch();
  }

  startProctoring() {
    const constraints = { video: true, audio: true };
    navigator.mediaDevices
      .getUserMedia(constraints)
      .then((stream) => {
        this.mediaStream = stream;
        this.videoElement.nativeElement.srcObject = stream;
        this.isProctoringActive = true;
        this.setupCanvas();
        this.drawOverlay();
        this.monitorDevices();
        this.startRecording();
      })
      .catch((error) => {
        this.showNotification('Error accessing media devices.', 'error');
      });
  }

  setupCanvas() {
    const canvas = this.overlayCanvas.nativeElement;
    canvas.width = this.videoElement.nativeElement.videoWidth || 640;
    canvas.height = this.videoElement.nativeElement.videoHeight || 480;
    this.context = canvas.getContext('2d')!;
    if (!this.context) {
      throw new Error('Failed to get canvas context');
    }
  }

  drawOverlay() {
    const video = this.videoElement.nativeElement;
    const canvas = this.overlayCanvas.nativeElement;
    const context = this.context;

    const updateOverlay = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      if (this.notificationMessage) {
        context.fillStyle = 'rgba(255, 0, 0, 0.7)';
        context.font = '24px Arial';
        context.fillText(this.notificationMessage, 10, 30);
      }

      requestAnimationFrame(updateOverlay);
    };

    updateOverlay();
  }

  startRecording() {
    const canvasStream = this.overlayCanvas.nativeElement.captureStream();
    const videoTrack = this.mediaStream.getVideoTracks()[0];
    const audioTrack = this.mediaStream.getAudioTracks()[0];

    const combinedStream = new MediaStream([
      canvasStream.getVideoTracks()[0],
      audioTrack,
    ]);

    this.mediaRecorder = new MediaRecorder(combinedStream);
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };
    this.mediaRecorder.start();
  }

  stopRecording() {
    this.mediaRecorder.stop();
    this.mediaRecorder.onstop = () => {
      const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'recorded-session.webm';
      a.click();
      this.isProctoringActive = false;

      
    };
  }
  

  showNotification(
    message: string,
    type: 'info' | 'warning' | 'error' = 'info'
  ) {
    this.notificationMessage = message;
    this.notificationType = type;

    setTimeout(() => {
      this.notificationMessage = null;
    }, 5000); // Dismiss after 5 seconds
  }

  trackTabSwitch() {
    document.addEventListener('visibilitychange', () => {
      if (this.isProctoringActive && document.hidden) {
        this.showNotification(
          'You switched tabs! Please stay on the exam page.',
          'warning'
        );
      }
    });
    window.addEventListener('blur', () => {
      if (this.isProctoringActive && !document.hidden) {
        this.showNotification(
          'You switched away from the browser! Please return to the exam.',
          'warning'
        );
      }
    });

    // window.addEventListener('focus', () => {
    //   windowFocus = true;
    // });

    // window.addEventListener('blur', () => {
    //   setTimeout(() => {
    //     if (!windowFocus && document.hidden) {
    //       this.showNotification(
    //         'You switched away from the browser! Please return to the exam.',
    //         'warning'
    //       );
    //     }
    //   }, 100);
    // });
  }
  monitorDevices() {
    const videoTrack = this.mediaStream.getVideoTracks()[0];
    const audioTrack = this.mediaStream.getAudioTracks()[0];

    if (!videoTrack.enabled || !audioTrack.enabled) {
      this.showNotification(
        'Camera or microphone is off! Please enable them.',
        'warning'
      );
    }

    videoTrack.onended = () => {
      this.showNotification('Camera has been turned off.', 'error');
    };

    audioTrack.onended = () => {
      this.showNotification('Microphone has been turned off.', 'error');
    };
  }
}

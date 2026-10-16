/**
 * MessyHandsAudioController - the one place the chime lives.
 *
 * Owns: the AudioComponent and its level. Plays a short soft chime when a
 * message lands, so the user knows something arrived without looking up.
 *
 * Does NOT own: when a message lands - MessyHandsMain calls playChime().
 */

const CHIME = requireAsset("../GeneratedSFX/MessageChime.wav") as AudioTrackAsset

@component
export class MessyHandsAudioController extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">MessyHandsAudioController - arrival chime</span>')
  @ui.separator

  @ui.label('<span style="color: #60A5FA;">Settings</span>')
  @ui.group_start("Settings")
  @input
  @widget(new SliderWidget(0, 1, 0.05))
  @hint("Chime level. Kept low so it sits under the room, not over it.")
  chimeVolume: number = 0.5
  @ui.group_end

  private audio: AudioComponent | null = null

  onAwake(): void {
    const audio = this.sceneObject.createComponent("Component.AudioComponent") as AudioComponent
    audio.audioTrack = CHIME
    audio.volume = this.chimeVolume
    // A cue tied to an event the user should notice immediately: Specs defaults
    // every AudioComponent to LowPower, which is audible as lag here.
    audio.playbackMode = Audio.PlaybackMode.LowLatency
    this.audio = audio
  }

  /** One short chime. Safe to call before onAwake has run (no-ops). */
  playChime(): void {
    if (!this.audio) return
    this.audio.volume = this.chimeVolume
    this.audio.play(1)
  }
}

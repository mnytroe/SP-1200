"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useSP1200Store } from "@/store/sp1200Store";

export default function SP1200() {
  const {
    audioInitialized,
    sliderValues,
    loadedSamples,
    initAudio,
    setSliderValue,
    loadSample,
    triggerPad,
  } = useSP1200Store();

  const [dragOverPad, setDragOverPad] = useState<number | null>(null);
  const [lcdText, setLcdText] = useState("SP-1200 READY");

  // Refs for interactive elements
  const slidersRef = useRef<(HTMLDivElement | null)[]>([]);

  // Handle audio initialization
  const handleStartAudio = async () => {
    try {
      await initAudio();
      setLcdText("AUDIO ACTIVE");
      console.log("[SP1200] Audio initialized");
    } catch (error) {
      console.error("[SP1200] Failed to initialize audio:", error);
      setLcdText("AUDIO ERROR");
    }
  };

  // Handle pad click - trigger sample
  const handlePadClick = useCallback(
    (index: number) => {
      console.log(`[SP1200] Pad ${index + 1} clicked`);
      if (audioInitialized) {
        triggerPad(index);
        setLcdText(`PAD ${index + 1} TRIGGERED`);
      } else {
        setLcdText("START AUDIO FIRST");
      }
    },
    [audioInitialized, triggerPad]
  );

  // Handle drag & drop for samples
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverPad(index);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverPad(null);
  };

  const handleDrop = async (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverPad(null);

    if (!audioInitialized) {
      setLcdText("START AUDIO FIRST");
      return;
    }

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith("audio/")) {
        try {
          setLcdText(`LOADING ${file.name.substring(0, 12)}...`);
          await loadSample(index, file);
          setLcdText(`PAD ${index + 1}: ${file.name.substring(0, 10)}`);
          console.log(`[SP1200] Sample loaded to pad ${index + 1}: ${file.name}`);
        } catch (error) {
          console.error("[SP1200] Failed to load sample:", error);
          setLcdText("LOAD ERROR");
        }
      } else {
        setLcdText("AUDIO FILES ONLY");
      }
    }
  };

  // Slider drag logic with store integration
  useEffect(() => {
    const sliderTracks = slidersRef.current.filter(Boolean);
    const cleanupFns: (() => void)[] = [];

    sliderTracks.forEach((track, index) => {
      if (!track) return;

      const knob = track.querySelector(".slider-knob") as HTMLDivElement;
      if (!knob) return;

      let isDragging = false;

      const updateSlider = (e: MouseEvent) => {
        const rect = track.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const percentage = Math.max(0, Math.min(100, (y / rect.height) * 100));
        knob.style.top = percentage + "%";
        // Invert percentage for value (top=0% means value=100%)
        const value = Math.round(100 - percentage);
        setSliderValue(index, value);
        console.log(`[SP1200] Slider ${index + 1}: ${value}%`);
      };

      const handleMouseDown = (e: MouseEvent) => {
        isDragging = true;
        e.preventDefault();
      };

      const handleMouseMove = (e: MouseEvent) => {
        if (isDragging) {
          updateSlider(e);
        }
      };

      const handleMouseUp = () => {
        isDragging = false;
      };

      const handleTrackClick = (e: MouseEvent) => {
        updateSlider(e);
      };

      knob.addEventListener("mousedown", handleMouseDown);
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      track.addEventListener("click", handleTrackClick);

      cleanupFns.push(() => {
        knob.removeEventListener("mousedown", handleMouseDown);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        track.removeEventListener("click", handleTrackClick);
      });
    });

    return () => cleanupFns.forEach((fn) => fn());
  }, [setSliderValue]);

  // Menu column LED toggle
  const handleMenuColumnBtnClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const btn = e.currentTarget;
    const controlsContainer = btn.closest(
      ".menu-column-controls-vertical, .menu-column-controls-inline"
    );
    if (controlsContainer) {
      const led = controlsContainer.querySelector(".menu-column-led");
      if (led) {
        led.classList.toggle("active");
      }
    }
  };

  // Performance LED cycling
  const handlePerfBtnClick = () => {
    const perfLeft = document.querySelector(".perf-left");
    if (!perfLeft) return;

    const perfLeds = perfLeft.querySelectorAll(".perf-led");
    let currentIndex = Array.from(perfLeds).findIndex((led) =>
      led.classList.contains("active")
    );
    if (currentIndex === -1) currentIndex = 0;

    perfLeds.forEach((led) => led.classList.remove("active"));
    const nextIndex = (currentIndex + 1) % perfLeds.length;
    perfLeds[nextIndex].classList.add("active");
  };

  // Bank LED cycling
  const handleBankBtnClick = () => {
    const bankColumn = document.querySelector(".bank-column");
    if (!bankColumn) return;

    const bankRows = bankColumn.querySelectorAll(".bank-row");
    const bankLeds = Array.from(bankRows).map((row) =>
      row.querySelector(".bank-led")
    );

    let currentIndex = bankLeds.findIndex(
      (led) => led && led.classList.contains("active")
    );
    if (currentIndex === -1) currentIndex = 0;

    bankLeds.forEach((led) => {
      if (led) led.classList.remove("active");
    });

    const nextIndex = (currentIndex + 1) % bankLeds.length;
    if (bankLeds[nextIndex]) {
      bankLeds[nextIndex]!.classList.add("active");
    }
  };

  // Programming LED cycling (Song/Segment)
  const handleProgBtnClick = () => {
    const progUnitFirst = document.querySelector(".prog-unit-first");
    if (!progUnitFirst) return;

    const progLeds = progUnitFirst.querySelectorAll(".prog-led-row .prog-led");
    if (progLeds.length !== 2) return;

    let currentIndex = Array.from(progLeds).findIndex((led) =>
      led.classList.contains("active")
    );
    if (currentIndex === -1) currentIndex = 0;

    progLeds.forEach((led) => led.classList.remove("active"));
    const nextIndex = (currentIndex + 1) % progLeds.length;
    progLeds[nextIndex].classList.add("active");
  };

  // Initial slider positions (inverted: value=45 means top=55%)
  const initialSliderTops = sliderValues.map((v) => 100 - v);

  return (
    <>
      <button
        className={`audio-init-btn ${audioInitialized ? "active" : ""}`}
        onClick={handleStartAudio}
      >
        {audioInitialized ? "Audio Active" : "Start Audio"}
      </button>

      <div className="sp1200">
        <div className="main-panel">
          {/* Header Bar */}
          <div className="header-bar">
            <div className="logo-section">
              <span className="sp-logo">SP</span>
              <span className="sp-number">1200</span>
              <span className="sp-subtitle">SAMPLING PERCUSSION</span>
            </div>
          </div>

          {/* Content Area */}
          <div className="content-area">
            {/* Left Section */}
            <div className="left-section">
              {/* Text Menus */}
              <div className="text-menus">
                <div className="menu-column-wrapper">
                  <div className="menu-title">Set-up</div>
                  <div className="menu-content-row">
                    <div className="menu-column-controls-vertical">
                      <div className="menu-column-led"></div>
                      <div
                        className="menu-column-btn"
                        onClick={handleMenuColumnBtnClick}
                      ></div>
                    </div>
                    <div className="menu-items">
                      <div className="menu-item">
                        <span className="menu-number">11</span> Multi Pitch
                      </div>
                      <div className="menu-item">
                        <span className="menu-number">12</span> Multi Level
                      </div>
                      <div className="menu-item">
                        <span className="menu-number">13</span> Exit Multi Mode
                      </div>
                      <div className="menu-item">
                        <span className="menu-number">14</span> Dynamic Buttons
                      </div>
                      <div className="menu-item">
                        <span className="menu-number">15</span> Delete Mix
                      </div>
                      <div className="menu-item">
                        <span className="menu-number">16</span> Select Mix
                      </div>
                      <div className="menu-item">
                        <span className="menu-number">17</span> Channel Assign
                      </div>
                      <div className="menu-item">
                        <span className="menu-number">18</span> Decay/Tune Select
                      </div>
                      <div className="menu-item">
                        <span className="menu-number">19</span> Loop/Truncate
                      </div>
                      <div className="menu-item">
                        <span className="menu-number">20</span> Delete Sound
                      </div>
                      <div className="menu-item">
                        <span className="menu-number">21</span> 1st Song/Step
                      </div>
                      <div className="menu-item">
                        <span className="menu-number">22</span> MIDI Parameters
                      </div>
                      <div className="menu-item">
                        <span className="menu-number">23</span> Special
                      </div>
                    </div>
                  </div>
                </div>
                <div className="menu-column-wrapper disk">
                  <div className="menu-title">Disk</div>
                  <div className="menu-content-row">
                    <div className="menu-column-controls-vertical">
                      <div className="menu-column-led"></div>
                      <div
                        className="menu-column-btn"
                        onClick={handleMenuColumnBtnClick}
                      ></div>
                    </div>
                    <div className="menu-items">
                      <div className="menu-item">
                        <span className="menu-number">1</span> Save Sequences
                      </div>
                      <div className="menu-item">
                        <span className="menu-number">2</span> Save Sounds
                      </div>
                      <div className="menu-item">
                        <span className="menu-number">3</span> Load Sequences
                      </div>
                      <div className="menu-item">
                        <span className="menu-number">4</span> Load Segment #
                      </div>
                      <div className="menu-item">
                        <span className="menu-number">5</span> Load Sounds
                      </div>
                      <div className="menu-item">
                        <span className="menu-number">6</span> Load Sound #
                      </div>
                      <div className="menu-item">
                        <span className="menu-number">7</span> Catalog Sequences
                      </div>
                      <div className="menu-item">
                        <span className="menu-number">8</span> Catalog Sounds
                      </div>
                      <div className="menu-item">
                        <span className="menu-number">9</span> Format/Copy Software
                      </div>
                      <div className="menu-item">
                        <span className="menu-number">0</span> Load Sequences and
                        Sounds
                      </div>
                    </div>
                  </div>
                </div>
                <div className="menu-column sync">
                  <div className="menu-title">Sync</div>
                  <div className="menu-column-controls-inline">
                    <div className="menu-column-led"></div>
                    <div
                      className="menu-column-btn"
                      onClick={handleMenuColumnBtnClick}
                    ></div>
                  </div>
                  <div className="menu-item">
                    <span className="menu-number">1</span> Internal
                  </div>
                  <div className="menu-item">
                    <span className="menu-number">2</span> MIDI
                  </div>
                  <div className="menu-item">
                    <span className="menu-number">3</span> SMPTE
                  </div>
                  <div className="menu-item">
                    <span className="menu-number">4</span> Click
                  </div>
                </div>
                <div className="menu-column sample">
                  <div className="menu-title">Sample</div>
                  <div className="sample-controls">
                    <div className="record-btn"></div>
                    <div className="gain-section">
                      <div className="knob"></div>
                      <span className="gain-label">Gain</span>
                    </div>
                  </div>
                  <div className="menu-item">
                    <span className="menu-number">1</span> VU Mode
                  </div>
                  <div className="menu-item">
                    <span className="menu-number">2</span> Assign Voice
                  </div>
                  <div className="menu-item">
                    <span className="menu-number">3</span> Level
                  </div>
                  <div className="menu-item">
                    <span className="menu-number">4</span> Threshold Set
                  </div>
                  <div className="menu-item">
                    <span className="menu-number">5</span> Sample Length
                  </div>
                  <div className="menu-item">
                    <span className="menu-number">6</span> Re-Sample
                  </div>
                  <div className="menu-item">
                    <span className="menu-number">7</span> Arm Sampling
                  </div>
                  <div className="menu-item">
                    <span className="menu-number">8</span> Force Sampling
                  </div>
                </div>
              </div>

              {/* Programming Section */}
              <div className="programming-section">
                <div className="section-title">Programming</div>
                <div className="blue-line"></div>
                <div className="prog-row">
                  <div className="prog-unit-first">
                    <div className="prog-btn" onClick={handleProgBtnClick}></div>
                    <div className="prog-leds">
                      <div className="prog-led-row">
                        <div className="prog-led active"></div>
                        <span className="prog-label">Song</span>
                      </div>
                      <div className="prog-led-row">
                        <div className="prog-led"></div>
                        <span className="prog-label">Segment</span>
                      </div>
                    </div>
                  </div>
                  <div className="prog-unit">
                    <div className="btn-label-top">Trigger</div>
                    <div className="prog-btn"></div>
                    <div className="btn-label-bottom">Metronome</div>
                  </div>
                  <div className="prog-unit">
                    <div className="btn-label-top">Repeat</div>
                    <div className="prog-btn"></div>
                    <div className="btn-label-bottom">Swing</div>
                  </div>
                  <div className="prog-unit">
                    <div className="btn-label-top">Subseq</div>
                    <div className="prog-btn"></div>
                    <div className="btn-label-bottom">Copy</div>
                  </div>
                  <div className="prog-unit">
                    <div className="btn-label-top">End</div>
                    <div className="prog-btn"></div>
                    <div className="btn-label-bottom">
                      Time
                      <br />
                      Signature
                    </div>
                  </div>
                  <div className="prog-unit">
                    <div className="btn-label-top">Insert</div>
                    <div className="prog-btn"></div>
                    <div className="btn-label-bottom">
                      Segment
                      <br />
                      Length
                    </div>
                  </div>
                  <div className="prog-unit">
                    <div className="btn-label-top">Delete</div>
                    <div className="prog-btn"></div>
                    <div className="btn-label-bottom">Erase</div>
                  </div>
                  <div className="prog-unit">
                    <div className="btn-label-top">
                      Tempo
                      <br />
                      Change
                    </div>
                    <div className="prog-btn"></div>
                    <div className="btn-label-bottom">
                      Auto
                      <br />
                      Correct
                    </div>
                  </div>
                  <div className="prog-unit">
                    <div className="btn-label-top">
                      Mix
                      <br />
                      Change
                    </div>
                    <div className="prog-btn"></div>
                    <div className="btn-label-bottom">
                      Step
                      <br />
                      Program
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Section */}
              <div className="performance-section">
                <div className="section-title">Performance</div>
                <div className="blue-line"></div>
                <div className="performance-content">
                  <div className="perf-left">
                    <div className="perf-row">
                      <div className="perf-btn-spacer"></div>
                      <div className="perf-led active"></div>
                      <span className="perf-label">Tune/Decay</span>
                    </div>
                    <div className="perf-row">
                      <div className="perf-btn" onClick={handlePerfBtnClick}></div>
                      <div className="perf-led"></div>
                      <span className="perf-label">Mix</span>
                    </div>
                    <div className="perf-row">
                      <div className="perf-btn-spacer"></div>
                      <div className="perf-led"></div>
                      <span className="perf-label">Multi Mode</span>
                    </div>
                  </div>
                  <div className="sliders-container">
                    {initialSliderTops.map((top, i) => (
                      <div className="slider-unit" key={i}>
                        <div
                          className="slider-track"
                          ref={(el) => {
                            slidersRef.current[i] = el;
                          }}
                        >
                          <div
                            className="slider-knob"
                            style={{ top: `${top}%` }}
                          ></div>
                        </div>
                        <span className="slider-number">{i + 1}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Pads Section */}
              <div className="pads-section">
                <div className="bank-column">
                  <div className="bank-row">
                    <div className="perf-btn-spacer"></div>
                    <div className="bank-led active"></div>
                    <span className="bank-label">A</span>
                  </div>
                  <div className="bank-row">
                    <div className="perf-btn-spacer"></div>
                    <div className="bank-led"></div>
                    <span className="bank-label">B</span>
                  </div>
                  <div className="bank-btn-row">
                    <div className="perf-btn" onClick={handleBankBtnClick}></div>
                  </div>
                  <div className="bank-row">
                    <div className="perf-btn-spacer"></div>
                    <div className="bank-led"></div>
                    <span className="bank-label">C</span>
                  </div>
                  <div className="bank-row">
                    <div className="perf-btn-spacer"></div>
                    <div className="bank-led"></div>
                    <span className="bank-label">D</span>
                  </div>
                </div>
                <div className="pads-container">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((num, i) => (
                    <div className="pad-unit" key={i}>
                      <div
                        className={`pad ${dragOverPad === i ? "drag-over" : ""} ${
                          loadedSamples[i] ? "has-sample" : ""
                        }`}
                        onClick={() => handlePadClick(i)}
                        onDragOver={(e) => handleDragOver(e, i)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, i)}
                      ></div>
                      <span className="pad-number">{num}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Section - Master Control */}
            <div className="right-section">
              <div className="master-header">
                <div className="master-control-section">
                  <div className="master-title">
                    <span className="first-letter">M</span>aster{" "}
                    <span className="first-letter">C</span>ontrol
                  </div>
                </div>
              </div>

              {/* LCD Display */}
              <div className="lcd-display">
                <div className="lcd-text">{lcdText}</div>
              </div>

              {/* Tempo/Transport Row */}
              <div className="tempo-row">
                <div className="transport-unit">
                  <div className="transport-btn"></div>
                  <div className="transport-label-bottom">Tempo</div>
                </div>
                <div className="transport-unit">
                  <div className="transport-btn"></div>
                  <div className="transport-label-bottom">◀</div>
                </div>
                <div className="transport-unit">
                  <div className="transport-btn"></div>
                  <div className="transport-label-bottom">▶</div>
                </div>
                <div className="transport-unit">
                  <div className="transport-btn enter-btn"></div>
                  <div className="transport-label-bottom">Enter</div>
                </div>
              </div>

              {/* Knobs */}
              <div className="knobs-row">
                <div className="gain-section">
                  <div className="knob"></div>
                  <span className="knob-label">
                    Mix
                    <br />
                    Volume
                  </span>
                </div>
                <div className="gain-section">
                  <div className="knob"></div>
                  <span className="knob-label">
                    Metronome
                    <br />
                    Volume
                  </span>
                </div>
              </div>

              {/* Numeric Keypad */}
              <div className="keypad">
                <div className="key-unit">
                  <div className="key-label-top">1</div>
                  <div className="key-btn"></div>
                </div>
                <div className="key-unit">
                  <div className="key-label-top">2</div>
                  <div className="key-btn"></div>
                </div>
                <div className="key-unit">
                  <div className="key-label-top">3</div>
                  <div className="key-btn"></div>
                </div>
                <div className="key-unit">
                  <div className="key-label-top">4</div>
                  <div className="key-btn"></div>
                </div>
                <div className="key-unit">
                  <div className="key-label-top">5</div>
                  <div className="key-btn"></div>
                </div>
                <div className="key-unit">
                  <div className="key-label-top">6</div>
                  <div className="key-btn"></div>
                </div>
                <div className="key-unit">
                  <div className="key-label-top">7</div>
                  <div className="key-btn"></div>
                  <div className="key-label-bottom">No</div>
                </div>
                <div className="key-unit">
                  <div className="key-label-top">8</div>
                  <div className="key-btn"></div>
                </div>
                <div className="key-unit">
                  <div className="key-label-top">9</div>
                  <div className="key-btn"></div>
                  <div className="key-label-bottom">Yes</div>
                </div>
              </div>

              {/* Zero Button */}
              <div className="zero-row">
                <div className="key-unit">
                  <div className="key-label-top">0</div>
                  <div className="key-btn"></div>
                </div>
              </div>

              <div className="blue-line"></div>
            </div>

            {/* Additional Controls */}
            <div className="additional-controls">
              <div className="pad-unit">
                <div className="pad"></div>
                <span className="pad-label">Tap/Repeat</span>
              </div>
              <div className="pad-unit">
                <div className="pad"></div>
                <span className="pad-label">Run/Stop</span>
              </div>
              <div className="gain-section">
                <div className="record-btn"></div>
                <span className="pad-label">Record/Edit</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="footer">
            <span className="footer-text">E-mu Systems, Inc.</span>
          </div>
        </div>
      </div>
    </>
  );
}

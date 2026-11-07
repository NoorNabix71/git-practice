# emni — Robotics Lab

An interactive, six-axis robot arm built with Three.js. The RK—06 concept features a translucent blue shell, detailed mechanical joints, and real-time articulation.

## Run locally

```sh
npm install
npm run dev
```

Create a production build with `npm run build`.

## Controls

- Drag the model to orbit; scroll or pinch to zoom.
- Adjust each of the six joint sliders independently.
- Try Home, Pick, Reach, and Inspect position presets.
- Select **Run demo sequence** (or press Space) to animate the arm.
- Toggle the transparent shell and wireframe overlay.
- Switch camera angles, reset the view, or enter fullscreen.
- Use **Export model** to download the current robot as a `.glb` file.

## Stack

Vite, Three.js, WebGL, and vanilla JavaScript. No backend is required.

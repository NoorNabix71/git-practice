# emni — Robotics Lab

An interactive, six-axis robot arm built with Three.js. The RK—06 concept features a translucent blue shell, detailed mechanical joints, and real-time articulation.

## Run locally

```sh
npm install
npm run dev
```

Create a production build with `npm run build`.

## GitHub Pages

The website is deployed automatically to **https://noornabix71.github.io/git-practice/** by the GitHub Actions workflow in `.github/workflows/deploy.yml`. Pushes to `main` or the Arena working branch trigger a new deployment. The workflow sets Vite's base path to `/git-practice/` for correct asset loading on GitHub Pages.

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

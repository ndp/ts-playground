import {ComponentBwilder} from '@ndp-software/component-bwilder';


const styles = `
drag-float {
}
drag-float:hover {
  border-color: black;
  background-color: #eee;
}`
const styleEl = document.createElement('style');
styleEl.textContent = styles;
document.body.prepend(styleEl);


const DragFloat = new ComponentBwilder()
    .wTagName('drag-float')
    .wShadowDOM('none')
    .wRender(function () {

            this.style.cursor = "grab"
            this.draggable = true

            let dragging = false
            let offsetLeft: number, offsetTop: number

            this.addEventListener("dragstart", (e) => {
                dragging = true
                e.dataTransfer!.effectAllowed = "move";
                offsetLeft = e.clientX - this.offsetLeft;
                offsetTop = e.clientY - this.offsetTop;
            })

            const positioningContext = this.offsetParent!
            positioningContext.addEventListener('dragenter', (e) => {
                if (dragging) e.preventDefault()
            })
            positioningContext.addEventListener("dragover", (e) => {
                if (dragging) e.preventDefault()
            })

            positioningContext.addEventListener('drop', (e: Event) => {
                if (dragging) {
                    e.preventDefault()
                    dragging = false
                    const endX = (e as DragEvent).clientX;
                    const endY = (e as DragEvent).clientY;
                    this.style.left = `${endX - offsetLeft}px`;
                    this.style.top = `${endY - offsetTop}px`;
                }
            })
            return {}
        }
    )
    .bwild()

export default DragFloat
import {ComponentBwilder} from '@ndp-software/component-bwilder';


const DragFloat = new ComponentBwilder()
    .wTagName('drag-float')
    .wShadowDOM('none')
    .wSubElement('floatWindow', HTMLDivElement)
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

            positioningContext.addEventListener('drop', (e: DragEvent) => {
                if (dragging) {
                    e.preventDefault()
                    dragging = false
                    const endX = e.clientX;
                    const endY = e.clientY;
                    this.style.left = `${endX - offsetLeft}px`;
                    this.style.top = `${endY - offsetTop}px`;
                }
            })

            this.addEventListener("drag", (e) => {
                console.log('drag')
            })


            return {floatWindow: this}
        }
    )
    .bwild()

export default DragFloat
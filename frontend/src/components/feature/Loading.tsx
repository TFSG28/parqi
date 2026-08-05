import Modal from '../ui/Modal'

const Loading = () => {
    return (
        <Modal className='z-50'>
            <div>
                <div className='flex flex-col justify-center items-center p-4 gap-5 z-50'>
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
                    <span>Carregando...</span>
                </div>
            </div>
        </Modal>
    )
}

export default Loading

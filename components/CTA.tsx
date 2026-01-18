import React from 'react'
import Image from 'next/image'
import Link from "next/link";

const CTA = () => {
  return (
    <section className="cta-section">
        <div className="cta-badge">
            Vágj bele még ma!
        </div>
        <h2 className="text-3xl font-bold">
            Építsd fel a személyre szabott tanulási utad!
        </h2>
        <p>
            Csatlakozz az eNvolve-hoz még ma, és tedd meg az első lépést az új készségek elsajátítása felé személyre szabott kurzusokkal és interaktív leckékkel.
        </p>
        <Image src="/images/cta.svg" alt="cta" width={362} height={232} />
        <button className="btn-primary">
            <Image src="/icons/plus.svg" alt="plus" width={12} height={12}/>
            <Link href="/courses/new">
                <p>Új kurzus létrehozása</p>
            </Link>
        </button>
    </section>
  )
}

export default CTA